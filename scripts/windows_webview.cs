using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal sealed class PeachWindow : Form
{
    private const string CapturePrefix = "peach:feedback-capture:";
    private readonly Uri page;
    private readonly string profile;
    private readonly string windowMarker;
    private readonly WebView2 view = new WebView2 { Dock = DockStyle.Fill };
    private int navigation;
    private bool ready;

    [DllImport("user32.dll")]
    private static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    private delegate bool EnumerateWindow(IntPtr window, IntPtr state);
    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumerateWindow visit, IntPtr state);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr GetProp(IntPtr window, string name);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool SetProp(IntPtr window, string name, IntPtr value);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr RemoveProp(IntPtr window, string name);
    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr window);

    [STAThread]
    private static void Main(string[] args)
    {
        Uri page;
        if (args.Length != 2 || !TryPeachAddress(args[0], out page) || !Path.IsPathRooted(args[1])) return;
        var profile = Path.GetFullPath(args[1]);
        string id;
        using (var sha = SHA256.Create())
            id = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(
                profile.ToUpperInvariant() + "\n" + page.GetLeftPart(UriPartial.Authority)))).Replace("-", "");
        var marker = "Peach.WebView." + id;
        bool first;
        using (var instance = new Mutex(true, "Local\\" + marker, out first))
        {
            if (!first)
            {
                EnumWindows((window, unused) =>
                {
                    if (GetProp(window, marker) == IntPtr.Zero) return true;
                    if (IsIconic(window)) ShowWindow(window, 9); // SW_RESTORE
                    SetForegroundWindow(window);
                    return false;
                }, IntPtr.Zero);
                return;
            }
            try { Run(page, profile, marker); }
            catch (Exception error)
            {
                Trace.WriteLine(error);
                OpenBrowser(page);
            }
        }
    }

    private static bool TryPeachAddress(string address, out Uri page)
    {
        return Uri.TryCreate(address, UriKind.Absolute, out page) && page.UserInfo.Length == 0 &&
            ((page.Scheme == Uri.UriSchemeHttp && page.IsLoopback) ||
             (page.Scheme == Uri.UriSchemeHttps && (page.IsLoopback || page.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase))));
    }

    private static void OpenBrowser(Uri address)
    {
        if (address.Scheme != Uri.UriSchemeHttp && address.Scheme != Uri.UriSchemeHttps) return;
        try { Process.Start(new ProcessStartInfo(address.AbsoluteUri) { UseShellExecute = true }); }
        catch (System.ComponentModel.Win32Exception error) { Trace.WriteLine(error); }
    }

    private static void Run(Uri page, string profile, string marker)
    {
        CoreWebView2Environment.GetAvailableBrowserVersionString();
        SetProcessDpiAwarenessContext(new IntPtr(-4)); // Per-monitor V2
        Application.EnableVisualStyles();
        using (var window = new PeachWindow(page, profile, marker))
        using (var context = new ApplicationContext(window))
        {
            EventHandler load = null;
            load = (sender, args) =>
            {
                Application.Idle -= load;
                window.StartWebView();
            };
            Application.Idle += load;
            Application.Run(context);
        }
    }

    private PeachWindow(Uri page, string profile, string marker)
    {
        this.page = page;
        this.profile = profile;
        windowMarker = marker;
        Text = "Peach";
        Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new System.Drawing.Size(1280, 800);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        Controls.Add(view);
    }

    protected override void OnHandleCreated(EventArgs args)
    {
        base.OnHandleCreated(args);
        SetProp(Handle, windowMarker, new IntPtr(1));
    }

    protected override void OnHandleDestroyed(EventArgs args)
    {
        RemoveProp(Handle, windowMarker);
        base.OnHandleDestroyed(args);
    }

    protected override void SetVisibleCore(bool visible)
    {
        base.SetVisibleCore(visible && ready);
    }

    private bool MatchesOrigin(string address)
    {
        Uri candidate;
        return Uri.TryCreate(address, UriKind.Absolute, out candidate) &&
            candidate.Scheme == page.Scheme && candidate.Host == page.Host && candidate.Port == page.Port;
    }

    private async void StartWebView()
    {
        try
        {
            var formHandle = Handle;
            var viewHandle = view.Handle;
            var environment = await CoreWebView2Environment.CreateAsync(null, profile);
            await view.EnsureCoreWebView2Async(environment);
            var core = view.CoreWebView2;
            core.Settings.AreHostObjectsAllowed = false;
            core.NavigationStarting += (source, change) =>
            {
                change.Cancel = !MatchesOrigin(change.Uri);
                if (!change.Cancel) { navigation++; return; }
                Uri external;
                if (change.IsUserInitiated && Uri.TryCreate(change.Uri, UriKind.Absolute, out external)) OpenBrowser(external);
            };
            core.NewWindowRequested += (source, request) =>
            {
                request.Handled = true;
                Uri address;
                if (!request.IsUserInitiated || !Uri.TryCreate(request.Uri, UriKind.Absolute, out address)) return;
                if (MatchesOrigin(request.Uri)) core.Navigate(request.Uri);
                else OpenBrowser(address);
            };
            EventHandler<CoreWebView2NavigationCompletedEventArgs> loaded = null;
            loaded = (source, result) =>
            {
                core.NavigationCompleted -= loaded;
                if (!result.IsSuccess && result.HttpStatusCode == 0) { FallBack(); return; }
                ready = true;
                Show();
            };
            core.NavigationCompleted += loaded;
            core.WebMessageReceived += CapturePage;
            await core.AddScriptToExecuteOnDocumentCreatedAsync(
                "if (top === self && location.origin === '" + page.GetLeftPart(UriPartial.Authority) +
                "') Object.defineProperty(window, 'peachDesktopFeedbackCapture', { value: true });");
            core.Navigate(page.AbsoluteUri);
        }
        catch (Exception error)
        {
            Trace.WriteLine(error);
            FallBack();
        }
    }

    private void FallBack()
    {
        OpenBrowser(page);
        Close();
    }

    private async void CapturePage(object sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        var core = (CoreWebView2)sender;
        if (!MatchesOrigin(args.Source) || !MatchesOrigin(core.Source)) return;
        string request;
        try { request = args.TryGetWebMessageAsString(); }
        catch (ArgumentException) { return; }
        Guid id;
        if (request == null || !request.StartsWith(CapturePrefix, StringComparison.Ordinal) ||
            !Guid.TryParseExact(request.Substring(CapturePrefix.Length), "D", out id)) return;

        int capturedNavigation = navigation;
        string image = "";
        try
        {
            var screenshot = await core.CallDevToolsProtocolMethodAsync("Page.captureScreenshot",
                "{\"format\":\"jpeg\",\"quality\":96,\"optimizeForSpeed\":true}");
            if (IsDisposed || navigation != capturedNavigation || !MatchesOrigin(core.Source)) return;
            core.PostWebMessageAsString(request + ":frame");
            var serializer = new JavaScriptSerializer { MaxJsonLength = Int32.MaxValue };
            var result = serializer.Deserialize<Dictionary<string, string>>(screenshot);
            if (result != null) result.TryGetValue("data", out image);
        }
        catch (COMException error) { System.Diagnostics.Trace.WriteLine(error); }
        catch (InvalidOperationException error) { System.Diagnostics.Trace.WriteLine(error); }
        catch (ArgumentException error) { System.Diagnostics.Trace.WriteLine(error); }

        if (!IsDisposed && navigation == capturedNavigation && MatchesOrigin(core.Source))
            core.PostWebMessageAsString(request + ":" + (image ?? ""));
    }
}

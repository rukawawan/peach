# CloudDrive 官方 API 接入

协议依据为 [官方 gRPC 指南](https://www.clouddrive2.com/api/CloudDrive2_gRPC_API_Guide.html)
及 [官方 proto](https://www.clouddrive2.com/api/clouddrive.proto)，版本 1.1.2。
核对的协议文件 SHA-256 为 `A00B4620CBCE0A9BD6009F8E771BA68EA7375080CA7F15F4C7C206310BA2EC9D`。
下列建议是根据字段和方法定义做的接入判断，尚未接入的接口没有性能结论。

## 已接入范围

云下载使用目录查询、目标目录创建、离线提交、离线列表、取消与配额接口。
代理设置使用 `GetAllCloudApis`、`GetCloudAPIConfig`、`SetCloudAPIConfig`、`GetMountPoints`。
账号匹配复用推送发现的路径前缀及 CloudDrive 挂载点，只显示已添加媒体库对应的账号。
容量设置通过 `GetSystemSettings.fileBufferDiskCacheLocation` 自动读取本机缓存目录，需 `allow_get_system_settings` 权限；远程服务的路径不推断成本机路径，保留手动映射。此调用只读，不改 CloudDrive 设置或清理缓存。
`GetApiTokenInfo` 用于核对权限；凭据复用本机 CredentialStore。

CloudDrive2 地址填写服务入口，例如 `http://127.0.0.1:19798`；媒体目录和 API 令牌分别填写。
端口须为 1–65535 的整数，IPv6 使用方括号，例如 `http://[::1]:19798`。
留空时只探测本机的 19798、29798 端口；检查结果填回表单，由用户保存。
已保存地址无效时，下载分区保留原值及其他有效偏好，并显示检查提示，可直接修正保存。
配置读取中某个可选区域失败时，该区域显示「未取得」与「重新读取」，其他区域继续可用；
持续失败时导出诊断报告，报告中的配置区域名称和诊断编号用于定位异常。

代理读写通过进程内 gRPC 服务验证序列化、鉴权元数据、配置字段保留、密码不回显、
修订冲突、账号归属和本机 HTTP 路由。生产写入由用户保存设置触发；测试不修改真实账号。
原始协议有未使用的字段，生成的 protobuf 消息仍会保留未知字段，修改代理后整份回传。
官方接口没有条件写入参数，读后比较只能检查已经发生的变更，无法消除跨客户端并发窗口。

## 值得继续接入的接口

| 优先级 | 官方接口 | Peach 可用场景 | 边界 |
| --- | --- | --- | --- |
| 高 | `GetSubFiles`、`FindFileByPath` | 首次添加网盘时直接取得目录、文件名和大小，识别视频与番号 | `GetSubFiles` 是单目录的流式列表，完整盘点仍需遍历；速度受网盘和 CD 缓存影响 |
| 高 | `GetOpenFileHandles`、`GetOpenFileTable`、`GetDownloadFileList` | 排查任务结束后仍在读取哪个文件、哪个进程打开了视频 | 包含其他应用的活动，不能把全部读取都算给 Peach |
| 高 | `GetFileBufferDiskCacheStats`、`ListDiskCacheFolders`、`GetActivePrefetchHints` | 展示缓存占用、目录缓存规则与预读活动，解释读量差异 | 缓存统计不是 Peach 的命中率；预读诊断中的缓存命中计数只对应预读系统 |
| 中 | `GetSpaceInfo`、`GetCloudMemberships`、`GetAllCloudApis` | 媒体库容量、会员到期、只读或账号锁定状态 | 云盘支持程度不同；无法取得的项目不能当作零或正常 |
| 中 | `GetUploadFileList`、`GetCopyTasks` | 展示整理、NFO 写回与复制的云端传输进度 | 本机写入完成不代表云端上传完成；需要按任务和路径关联 |
| 后续评估 | `PrefetchFileRanges`、`CancelFilePrefetch` | 播放和九宫格只请求所需字节范围，以优先级协调预读 | 会主动消耗流量，应先验证缓存及 Range 行为，只取消本次创建的提示 |

首次目录识别优先验证目录 API：用相同目录比较挂载遍历与 API 列表的耗时、请求量和文件完整性。
`GetFileDetailProperties` 有目录总文件数等字段，但没有按扩展名的视频数或 JAV 数；
`GetSearchResults` 能否覆盖完整目录也依赖来源，不能据此承诺首次添加即可瞬间精确计数。

缓存清理、全局传输取消、强制关闭文件读取器及挂载修改具有全局影响，不能作为普通刷新或任务取消的附带动作。
具体接入按方法检查版本和令牌权限，旧版本拒绝某个可选接口时保留现有挂载流程。

/* receipts 域控制器：本域状态与动作，启动由 Application 的生命周期统一安装。 */
import { $, esc, icon, newSeed, seededRank } from '../core';
import { playUiSound } from '../ui-kit/sounds';
import { mountToaster, showToast } from '../react/application-residents';
import { setActionBusy } from '../ui-kit';
import { t } from '../i18n';
export const receiptsState = { toastBody: undefined, toastSeq: undefined, toast: undefined, actionReceipt: undefined, actionFailure: undefined, rollSeed: undefined, seededSample: undefined };



export function installReceipts6() {
mountToaster($('#toasts'),{success:icon('check'),error:icon('circle-alert')});
receiptsState.toastBody = message=>message&&typeof message==='object'&&'html' in message
  ? String(message.html)
  : esc(message&&typeof message==='object'?(message.text??''):message??'');
receiptsState.toastSeq = 0;
receiptsState.toast = (message,{timeout=6000,warn=false,action=null,sound=null}={})=>{
  const id=`toast-${++receiptsState.toastSeq}`;
  const show=(body,alert,duration,next)=>{
    playUiSound(sound||(alert?'error':'success'));
    showToast($('#toasts'),{success:icon('check'),error:icon('circle-alert')},id,{html:body,alert:!!alert,timeout:duration,
      action:next&&!alert?{label:next.label,run:button=>{setActionBusy(button);next.run()}}:null});
  };
  show(receiptsState.toastBody(message),warn,timeout,action);
  /* 结果就写在同一条 toast 上（同一个 id）。「关掉回执 + 另发一条已撤销」会让两条在同一个
     底部对齐的栈里一进一出，看上去就是整块跳了一下。 */
  return {replaceMessage:(body,{warn:alert=false,timeout:next=4000}={})=>show(receiptsState.toastBody(body),alert,next,null)};
};
receiptsState.actionReceipt = (message,{undo=null,timeout=undo?8000:6000}={})=>{
  let item=null;
  item=receiptsState.toast({text:message},{
    timeout,
    action:undo?{label:t('shell:shared.undo'),run:async()=>{
      try{await undo();item.replaceMessage({text:t('shell:receipt.undone')})}
      catch(error){item.replaceMessage({text:t('shell:receipt.undoFailed',{message:error.message||t('shell:receipt.tryAgain')})},{warn:true})}
    }}:null,
  });
  return item;
};
receiptsState.actionFailure = (message,error)=>receiptsState.toast(
  {text:t('shell:receipt.actionFailed',{action:message,message:error?.message||t('shell:receipt.tryAgain')})},{warn:true});
receiptsState.rollSeed = ()=>newSeed();
receiptsState.seededSample = (rows,count,seed,key=row=>row.k)=>{
  if(rows.length<=count)return rows;
  const picked=new Set([...rows]
    .sort((a,b)=>seededRank(seed,key(a))-seededRank(seed,key(b)))
    .slice(0,count).map(key));
  return rows.filter(row=>picked.has(key(row)));
};
}

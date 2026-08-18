import React, { useEffect, useState } from 'react';
import { Input, Dropdown } from 'antd';
import {
  Bot, Send, Plus, Star, X, Trash2, Copy, Check, MessageCircle,
  Zap, Globe, Image, FileText, BarChart2, RefreshCw, Edit3, Download,
  MoreHorizontal, AlertCircle, Pin,
} from 'lucide-react';
import { Toast } from '../../components/shared';
import { chatApi } from '../../services/api/index';

const QUICK_ACTIONS = [
  { icon: MessageCircle, label: '产品介绍', prompt: 'Write a product introduction for eco-friendly bags' },
  { icon: FileText, label: '写邮件', prompt: 'Draft a professional email to a client about bag pricing' },
  { icon: BarChart2, label: '数据分析', prompt: 'Analyze the latest sales data and provide insights' },
  { icon: Globe, label: '翻译', prompt: 'Translate the following text to Spanish' },
  { icon: Image, label: '生成描述', prompt: 'Generate product descriptions for eco bags' },
  { icon: Zap, label: '竞品分析', prompt: 'Analyze competitor eco bag products' },
];

type Message = { id: string | number; role: 'user' | 'ai'; text: string; attachments?: { name: string; size: string }[] };
type Conversation = { id: string; title: string; time: string; active: boolean; starred: boolean };

// ─────────────── Rename Modal ───────────────
const RenameModal: React.FC<{ currentTitle: string; onClose: () => void; onSave: (t: string) => void }> = ({ currentTitle, onClose, onSave }) => {
  const [title, setTitle] = useState(currentTitle);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">重命名对话</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">
          <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">对话标题</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="输入新标题..." variant="filled" size="middle" onKeyDown={e => { if (e.key === 'Enter') { onSave(title); } }} />
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
          <button onClick={() => { if (title) onSave(title); }} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90">保存</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────── Delete Confirm Modal ───────────────
const DeleteConfirmModal: React.FC<{ name: string; onClose: () => void; onConfirm: () => void }> = ({ name, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-500" /></div>
        <h3 className="text-lg font-bold text-foreground mb-2">确认删除对话</h3>
        <p className="text-sm text-muted-foreground">确定要删除 <strong className="text-foreground">{name}</strong> 吗？此操作不可撤销。</p>
      </div>
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">确认删除</button>
      </div>
    </div>
  </div>
);

// ─────────────── Clear Confirm Modal ───────────────
const ClearConfirmModal: React.FC<{ name: string; onClose: () => void; onConfirm: () => void }> = ({ name, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="px-6 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-amber-500" /></div>
        <h3 className="text-lg font-bold text-foreground mb-2">清空对话记录</h3>
        <p className="text-sm text-muted-foreground">确定要清空 <strong className="text-foreground">{name}</strong> 的所有消息吗？</p>
      </div>
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-secondary/20">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary">取消</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">确认清空</button>
      </div>
    </div>
  </div>
);

const AIChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const [renameConv, setRenameConv] = useState<{ id: string; title: string } | null>(null);
  const [deleteConv, setDeleteConv] = useState<{ id: string; title: string } | null>(null);
  const [clearConv, setClearConv] = useState<{ id: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const messages = chatMessages[activeConv] || [];

  const loadMessages = async (sessionId: string) => {
    const items = await chatApi.getMessages(sessionId);
    setChatMessages(prev => ({ ...prev, [sessionId]: items.map(item => ({ id: item.id, role: item.type === 'user' ? 'user' : 'ai', text: item.text || '' })) }));
  };
  useEffect(() => { chatApi.listSessions().then(items => { const mapped = items.map((item, index) => ({ id: item.id, title: item.title, time: new Date(item.updatedAt).toLocaleString(), active: index === 0, starred: item.starred })); setConversations(mapped); if (mapped[0]) { setActiveConv(mapped[0].id); loadMessages(mapped[0].id); } }).catch(() => setToast({ message: '会话加载失败', type: 'error' })); }, []);

  const sendMessage = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() && attachments.length === 0) return;
    const newMsg: Message = { id: Date.now(), role: 'user', text: msg, attachments: attachments.length ? [...attachments] : undefined };
    setChatMessages(prev => ({ ...prev, [activeConv]: [...(prev[activeConv] || []), newMsg] }));
    setInput('');
    setAttachments([]);
    setIsTyping(true);
    try { const reply = await chatApi.sendMessage(activeConv, msg); setIsTyping(false); const aiReply: Message = { id: reply.id, role: 'ai', text: reply.text || '' };
      setChatMessages(prev => ({ ...prev, [activeConv]: [...(prev[activeConv] || []), aiReply] }));
    } catch { setIsTyping(false); setToast({ message: '消息发送失败', type: 'error' }); }
  };

  const handleCopy = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToast({ message: '已复制到剪贴板', type: 'success' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = async () => {
    const created = await chatApi.createSession(); const newId = created.id;
    const newConv = { id: newId, title: created.title, time: 'Just now', active: true, starred: false };
    setConversations(prev => prev.map(c => ({ ...c, active: false })).concat(newConv));
    setChatMessages(prev => ({ ...prev, [newId]: [{ id: Date.now(), role: 'ai', text: '你好！我是迈犀沃 AI 助手。可以协助您处理商品、客户、商机、开发信与独立站运营。' }] }));
    setActiveConv(newId);
    setToast({ message: '已创建新对话', type: 'success' });
  };

  const handleRename = async (title: string) => {
    if (!renameConv) return;
    await chatApi.updateSession(renameConv.id, { title });
    setConversations(prev => prev.map(c => c.id === renameConv.id ? { ...c, title } : c));
    setRenameConv(null);
    setToast({ message: '对话已重命名', type: 'success' });
  };

  const handleDelete = async () => {
    if (!deleteConv) return;
    await chatApi.deleteSession(deleteConv.id);
    setConversations(prev => prev.filter(c => c.id !== deleteConv.id));
    const newChats = { ...chatMessages };
    delete newChats[deleteConv.id];
    setChatMessages(newChats);
    if (activeConv === deleteConv.id) {
      const remaining = conversations.filter(c => c.id !== deleteConv.id);
      if (remaining.length > 0) {
        setActiveConv(remaining[0].id);
        setConversations(prev => prev.map(c => c.id === remaining[0].id ? { ...c, active: true } : { ...c, active: false }));
      }
    }
    setDeleteConv(null);
    setToast({ message: '对话已删除', type: 'success' });
  };

  const handleClear = async () => {
    if (!clearConv) return;
    await chatApi.clearSession(clearConv.id);
    setChatMessages(prev => ({ ...prev, [clearConv.id]: [] }));
    setClearConv(null);
    setToast({ message: '对话记录已清空', type: 'success' });
  };

  const handleToggleStar = async (id: string) => {
    const item = conversations.find(c => c.id === id); if (!item) return;
    await chatApi.updateSession(id, { starred: !item.starred });
    setConversations(prev => prev.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
  };

  const handleExport = () => {
    const conv = conversations.find(c => c.id === activeConv);
    const msgs = chatMessages[activeConv] || [];
    const text = msgs.map(m => `[${m.role === 'user' ? '用户' : 'AI'}]: ${m.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv?.title || 'conversation'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: '对话已导出', type: 'success' });
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return 0;
  });

  return (
    <div className="flex h-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
      {/* Left: Conversations */}
      <div className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-gray-900">AI 对话</h2>
            <button onClick={handleNewChat} className="p-1.5 hover:bg-gray-100 rounded-lg"><Plus className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">全部对话</span>
            <span className="ml-auto bg-white text-xs px-2 py-0.5 rounded-full font-bold text-gray-600">{conversations.length}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {sortedConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => {
                setActiveConv(conv.id);
                loadMessages(conv.id);
                setConversations(prev => prev.map(c => ({ ...c, active: c.id === conv.id })));
              }}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group ${activeConv === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {conv.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
                    <div className="text-sm font-semibold text-gray-800 truncate">{conv.title}</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{conv.time}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleToggleStar(conv.id)} className="p-1 hover:bg-gray-200 rounded" title={conv.starred ? '取消收藏' : '收藏'}><Star className={`w-3 h-3 ${conv.starred ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} /></button>
                  <button onClick={() => setRenameConv({ id: conv.id, title: conv.title })} className="p-1 hover:bg-gray-200 rounded" title="重命名"><Edit3 className="w-3 h-3 text-gray-400" /></button>
                  <button onClick={() => setDeleteConv({ id: conv.id, title: conv.title })} className="p-1 hover:bg-red-50 rounded" title="删除"><Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" /></button>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            </div>
            GPT-4o · 已连接
          </div>
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900">迈犀沃 AI 助手</div>
              <div className="text-xs text-gray-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />GPT-4o · 在线</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleExport} className="p-2 hover:bg-gray-100 rounded-lg" title="导出对话"><Download className="w-4 h-4 text-gray-400" /></button>
            <button onClick={() => setClearConv({ id: activeConv, title: conversations.find(c => c.id === activeConv)?.title || '' })} className="p-2 hover:bg-gray-100 rounded-lg" title="清空对话"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
            <button className="p-2 hover:bg-gray-100 rounded-lg" title="置顶"><Pin className="w-4 h-4 text-gray-400" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5 bg-gray-50/50">
          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === 'ai' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-4 h-4 text-white" /></div>
                  <div className="max-w-[75%]">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"><div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.text}</div></div>
                    <div className="flex gap-2 mt-1.5">
                      <button onClick={() => handleCopy(msg.text, msg.id)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}{copiedId === msg.id ? '已复制' : '复制'}
                      </button>
                      <button onClick={() => sendMessage('请重新生成回答')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><RefreshCw className="w-3 h-3" />重新生成</button>
                    </div>
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex justify-end gap-3">
                  <div className="max-w-[75%]">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex gap-2 mb-2 justify-end">
                        {msg.attachments.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"><Image className="w-3.5 h-3.5 text-gray-400" />{a.name} · {a.size}</div>
                        ))}
                      </div>
                    )}
                    <div className="bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">{msg.text}</div>
                  </div>
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs text-white font-bold">张</span></div>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-white" /></div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-3">
                  {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-2 border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <button key={i} onClick={() => sendMessage(action.prompt)} className="flex items-center gap-1.5 px-3 py-2 border border-primary/30 text-primary rounded-full text-xs font-semibold hover:bg-primary/5 transition-colors whitespace-nowrap flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" />{action.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-end gap-2 px-5 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 flex-shrink-0"><Plus className="w-4 h-4" /></button>
          <div className="flex-1">
            <Input.TextArea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="输入消息... (Shift+Enter 换行)"
              variant="filled"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ borderRadius: 12, padding: '10px 14px' }}
            />
          </div>
          <button onClick={() => sendMessage()} className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 flex-shrink-0"><Send className="w-4 h-4" /></button>
        </div>
      </div>

      {renameConv && <RenameModal currentTitle={renameConv.title} onClose={() => setRenameConv(null)} onSave={handleRename} />}
      {deleteConv && <DeleteConfirmModal name={deleteConv.title} onClose={() => setDeleteConv(null)} onConfirm={handleDelete} />}
      {clearConv && <ClearConfirmModal name={clearConv.title} onClose={() => setClearConv(null)} onConfirm={handleClear} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AIChatPage;

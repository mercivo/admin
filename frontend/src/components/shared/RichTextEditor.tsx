import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Bold, ImagePlus, Italic, List, ListOrdered, LoaderCircle, Quote, Redo2, Strikethrough, Undo2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = '请输入商品描述', onUploadImage }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const editor = useEditor({
    extensions: [StarterKit, Image, Link.configure({ openOnClick: false })],
    content: value,
    editorProps: { attributes: { class: 'min-h-[280px] px-5 py-4 text-sm leading-7 text-foreground outline-none', 'data-placeholder': placeholder } },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });
  useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', false); }, [editor, value]);
  if (!editor) return null;
  const actions = [
    { label: '粗体', icon: Bold, active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { label: '斜体', icon: Italic, active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { label: '删除线', icon: Strikethrough, active: editor.isActive('strike'), run: () => editor.chain().focus().toggleStrike().run() },
    { label: '无序列表', icon: List, active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: '有序列表', icon: ListOrdered, active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: '引用', icon: Quote, active: editor.isActive('blockquote'), run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  const insertImage = async (file?: File) => {
    if (!file || !onUploadImage) return;
    setUploadingImage(true);
    try {
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  return <div className="overflow-hidden rounded-xl border border-border bg-white focus-within:border-primary [&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-7 [&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-7 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary/40 [&_.ProseMirror_blockquote]:bg-secondary/50 [&_.ProseMirror_blockquote]:px-4 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_p]:my-2 [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:max-h-[480px] [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-xl">
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-secondary/40 px-3 py-2">
      {actions.map(action => <button type="button" key={action.label} title={action.label} aria-label={action.label} onMouseDown={event => { event.preventDefault(); action.run(); }} className={`rounded p-1.5 ${action.active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white hover:text-foreground'}`}><action.icon className="h-4 w-4" /></button>)}
      {onUploadImage && <>
        <span className="mx-1 h-4 w-px bg-border" />
        <input ref={imageInputRef} data-testid="rich-text-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingImage} onChange={event => void insertImage(event.target.files?.[0])} />
        <button type="button" title="上传图片" aria-label="上传图片到商品描述" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} className="rounded p-1.5 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-50">{uploadingImage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}</button>
      </>}
      <span className="mx-1 h-4 w-px bg-border" />
      <button type="button" title="撤销" aria-label="撤销" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} className="rounded p-1.5 text-muted-foreground hover:bg-white disabled:opacity-30"><Undo2 className="h-4 w-4" /></button>
      <button type="button" title="重做" aria-label="重做" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} className="rounded p-1.5 text-muted-foreground hover:bg-white disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
    </div>
    <EditorContent editor={editor} />
  </div>;
};

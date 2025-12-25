'use client';

import { useState } from 'react';
import {
  Type,
  Image,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  List,
  Code,
  Eye,
  Save,
  Send,
} from 'lucide-react';

/**
 * Email Builder Component
 *
 * WYSIWYG editor for creating email templates with:
 * - Drag-and-drop blocks
 * - Variable substitution ({{firstName}}, {{botName}}, etc.)
 * - Live preview
 * - Responsive design
 * - Save as template
 */

interface EmailBlock {
  id: string;
  type: 'text' | 'heading' | 'button' | 'image' | 'divider' | 'spacer';
  content: string;
  style?: Record<string, string>;
}

interface EmailBuilderProps {
  initialContent?: string;
  onSave?: (html: string) => void;
  onTestSend?: (html: string) => void;
}

export default function EmailBuilder({
  initialContent = '',
  onSave,
  onTestSend,
}: EmailBuilderProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    {
      id: '1',
      type: 'heading',
      content: 'Welcome to TIME!',
      style: { fontSize: '28px', color: '#ffffff', textAlign: 'center' },
    },
    {
      id: '2',
      type: 'text',
      content: 'Hello {{firstName}}, thanks for joining our platform!',
      style: { fontSize: '16px', color: '#e2e8f0' },
    },
  ]);

  const [showPreview, setShowPreview] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type),
      style: getDefaultStyle(type),
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    setBlocks(blocks.map(block => (block.id === id ? { ...block, ...updates } : block)));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(block => block.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const generateHTML = (): string => {
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">TIME Trading</h1>
        </div>
        <div style="padding: 40px; background: #1e293b; color: #e2e8f0;">
          ${blocks.map(block => renderBlock(block)).join('\n')}
        </div>
        <div style="padding: 20px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px;">
          <p>© 2025 TIME Trading. All rights reserved.</p>
          <p><a href="https://timebeyondus.com/unsubscribe" style="color: #7c3aed;">Unsubscribe</a></p>
        </div>
      </div>
    `;
    return emailHTML;
  };

  const renderBlock = (block: EmailBlock): string => {
    const style = Object.entries(block.style || {})
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');

    switch (block.type) {
      case 'heading':
        return `<h2 style="${style}">${block.content}</h2>`;
      case 'text':
        return `<p style="${style}">${block.content}</p>`;
      case 'button':
        return `<div style="text-align: center; margin: 20px 0;"><a href="#" style="${style}">${block.content}</a></div>`;
      case 'image':
        return `<img src="${block.content}" style="${style}" alt="Email image" />`;
      case 'divider':
        return `<hr style="${style}" />`;
      case 'spacer':
        return `<div style="height: ${block.style?.height || '20px'};"></div>`;
      default:
        return '';
    }
  };

  const handleSave = () => {
    const html = generateHTML();
    onSave?.(html);
  };

  const handleTestSend = () => {
    const html = generateHTML();
    onTestSend?.(html);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar - Block Library */}
      <div className="w-64 bg-slate-900 border-r border-white/10 p-4">
        <h3 className="text-white font-bold mb-4">Add Blocks</h3>
        <div className="space-y-2">
          <button
            onClick={() => addBlock('heading')}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-left flex items-center gap-2"
          >
            <Type className="w-4 h-4" />
            Heading
          </button>
          <button
            onClick={() => addBlock('text')}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-left flex items-center gap-2"
          >
            <AlignLeft className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => addBlock('button')}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-left flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Button
          </button>
          <button
            onClick={() => addBlock('image')}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-left flex items-center gap-2"
          >
            <Image className="w-4 h-4" />
            Image
          </button>
          <button
            onClick={() => addBlock('divider')}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-left"
          >
            Divider
          </button>
          <button
            onClick={() => addBlock('spacer')}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-left"
          >
            Spacer
          </button>
        </div>

        <div className="mt-8 p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
          <h4 className="text-purple-400 font-bold mb-2">Variables</h4>
          <p className="text-white/60 text-xs mb-2">Use these in your content:</p>
          <code className="text-xs text-purple-300 block">{`{{firstName}}`}</code>
          <code className="text-xs text-purple-300 block">{`{{lastName}}`}</code>
          <code className="text-xs text-purple-300 block">{`{{email}}`}</code>
          <code className="text-xs text-purple-300 block">{`{{botName}}`}</code>
          <code className="text-xs text-purple-300 block">{`{{profit}}`}</code>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Email Builder</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={handleTestSend}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Test Send
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
            </div>
          </div>

          {showPreview ? (
            <div
              className="bg-white rounded-lg p-8"
              dangerouslySetInnerHTML={{ __html: generateHTML() }}
            />
          ) : (
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedBlockId === block.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 bg-slate-800/50 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-white/40 uppercase">{block.type}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          moveBlock(block.id, 'up');
                        }}
                        disabled={index === 0}
                        className="p-1 text-white/40 hover:text-white disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          moveBlock(block.id, 'down');
                        }}
                        disabled={index === blocks.length - 1}
                        className="p-1 text-white/40 hover:text-white disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteBlock(block.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {block.type === 'text' || block.type === 'heading' ? (
                    <textarea
                      value={block.content}
                      onChange={e =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      className="w-full bg-slate-900 text-white p-2 rounded border border-white/10 resize-none"
                      rows={2}
                    />
                  ) : block.type === 'button' ? (
                    <input
                      type="text"
                      value={block.content}
                      onChange={e =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      placeholder="Button Text"
                      className="w-full bg-slate-900 text-white p-2 rounded border border-white/10"
                    />
                  ) : block.type === 'image' ? (
                    <input
                      type="text"
                      value={block.content}
                      onChange={e =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      placeholder="Image URL"
                      className="w-full bg-slate-900 text-white p-2 rounded border border-white/10"
                    />
                  ) : (
                    <div className="text-white/40 text-sm">{block.type}</div>
                  )}
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  <p>No blocks yet. Add some from the sidebar!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedBlock && !showPreview && (
        <div className="w-80 bg-slate-900 border-l border-white/10 p-4 overflow-y-auto">
          <h3 className="text-white font-bold mb-4">Block Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Font Size</label>
              <input
                type="text"
                value={selectedBlock.style?.fontSize || '16px'}
                onChange={e =>
                  updateBlock(selectedBlock.id, {
                    style: { ...selectedBlock.style, fontSize: e.target.value },
                  })
                }
                className="w-full bg-slate-800 text-white p-2 rounded border border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Color</label>
              <input
                type="text"
                value={selectedBlock.style?.color || '#e2e8f0'}
                onChange={e =>
                  updateBlock(selectedBlock.id, {
                    style: { ...selectedBlock.style, color: e.target.value },
                  })
                }
                className="w-full bg-slate-800 text-white p-2 rounded border border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Text Align</label>
              <select
                value={selectedBlock.style?.textAlign || 'left'}
                onChange={e =>
                  updateBlock(selectedBlock.id, {
                    style: { ...selectedBlock.style, textAlign: e.target.value },
                  })
                }
                className="w-full bg-slate-800 text-white p-2 rounded border border-white/10"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultContent(type: EmailBlock['type']): string {
  switch (type) {
    case 'heading':
      return 'New Heading';
    case 'text':
      return 'Your text here...';
    case 'button':
      return 'Click Here';
    case 'image':
      return 'https://via.placeholder.com/600x300';
    case 'divider':
      return '';
    case 'spacer':
      return '';
    default:
      return '';
  }
}

function getDefaultStyle(type: EmailBlock['type']): Record<string, string> {
  switch (type) {
    case 'heading':
      return { fontSize: '24px', color: '#ffffff', textAlign: 'left' };
    case 'text':
      return { fontSize: '16px', color: '#e2e8f0', lineHeight: '1.6' };
    case 'button':
      return {
        display: 'inline-block',
        background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
        color: '#ffffff',
        padding: '15px 40px',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
      };
    case 'image':
      return { width: '100%', maxWidth: '600px', borderRadius: '8px' };
    case 'divider':
      return { border: 'none', borderTop: '1px solid #334155', margin: '20px 0' };
    case 'spacer':
      return { height: '20px' };
    default:
      return {};
  }
}

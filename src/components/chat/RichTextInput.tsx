// src/components/chat/RichTextInput.tsx
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FileText, X } from 'lucide-react';

interface Mention {
  name: string;
  id: string;
  type: 'doc' | 'user';
  startIndex: number;
  endIndex: number;
}

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}

export interface RichTextInputRef {
  insertAtCursor: (text: string, replaceQuery?: string) => void;
  focus: () => void;
}

export const RichTextInput = forwardRef<RichTextInputRef, RichTextInputProps>(({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Type a message...',
  disabled = false,
  minHeight = 44,
  maxHeight = 160,
  className = '',
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isComposingRef = useRef(false);
  const isInternalUpdateRef = useRef(false);
  const previousValueRef = useRef(value);
  const forceRenderRef = useRef(false);
  const isUpdatingDOMRef = useRef(false);

  // Parse markdown mentions from the value string
  const parseMentions = useCallback((text: string): Mention[] => {
    const mentions: Mention[] = [];
    const regex = /@\[([^\]]+)\]\((doc|user):([^)]+)\)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      mentions.push({
        name: match[1],
        type: match[2] as 'doc' | 'user',
        id: match[3],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return mentions;
  }, []);

  // Convert markdown value to rich HTML representation
  const valueToHTML = useCallback((text: string): string => {
    if (!text) return '';

    const mentions = parseMentions(text);
    if (mentions.length === 0) {
      // Escape HTML and preserve whitespace
      return text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    let html = '';
    let lastIndex = 0;

    mentions.forEach((mention) => {
      // Add text before the mention
      if (mention.startIndex > lastIndex) {
        const textBefore = text.substring(lastIndex, mention.startIndex);
        html += textBefore.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
      }

      // Add the mention as a pill with reduced max width to prevent overflow
      if (mention.type === 'doc') {
        html += `<span class="mention-pill doc-mention inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-sm font-medium mx-1 border border-blue-200" contenteditable="false" data-type="doc" data-id="${mention.id}" data-name="${mention.name.replace(/"/g, '&quot;')}" style="user-select: none; white-space: nowrap; max-width: 240px;">` +
          `<span class="mention-icon flex-shrink-0">📄</span>` +
          `<span class="mention-name flex-1 overflow-hidden text-ellipsis whitespace-nowrap">${mention.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>` +
          `<button class="mention-remove flex-shrink-0 w-4 h-4 flex items-center justify-center border-0 bg-transparent text-blue-600 cursor-pointer rounded opacity-70 hover:opacity-100 hover:bg-blue-600 hover:text-white transition-all text-lg leading-none p-0 m-0" type="button" aria-label="Remove document" style="font-size: 18px; line-height: 1;">×</button>` +
          `</span>`;
      } else {
        // User mention
        html += `<span class="mention-pill user-mention inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-sm font-medium mx-1 border border-indigo-200" contenteditable="false" data-type="user" data-id="${mention.id}" data-name="${mention.name.replace(/"/g, '&quot;')}" style="user-select: none; white-space: nowrap; max-width: 240px;">` +
          `<span class="mention-icon flex-shrink-0 font-bold">@</span>` +
          `<span class="mention-name flex-1 overflow-hidden text-ellipsis whitespace-nowrap">${mention.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>` +
          `<button class="mention-remove flex-shrink-0 w-4 h-4 flex items-center justify-center border-0 bg-transparent text-indigo-600 cursor-pointer rounded opacity-70 hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all text-lg leading-none p-0 m-0" type="button" aria-label="Remove user" style="font-size: 18px; line-height: 1;">×</button>` +
          `</span>`;
      }

      lastIndex = mention.endIndex;
    });

    // Add remaining text after the last mention
    if (lastIndex < text.length) {
      const textAfter = text.substring(lastIndex);
      html += textAfter.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    return html;
  }, [parseMentions]);

  // Convert HTML back to markdown value
  const htmlToValue = useCallback((element: HTMLElement): string => {
    let result = '';
    
    const traverse = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        
        if (el.classList.contains('mention-pill')) {
          const id = el.getAttribute('data-id') || el.getAttribute('data-resource-id'); // Fallback for backward compatibility
          const name = el.getAttribute('data-name') || el.getAttribute('data-doc-name'); // Fallback
          const type = el.getAttribute('data-type') || (el.classList.contains('doc-mention') ? 'doc' : 'user');
          
          if (id && name) {
            result += `@[${name}](${type}:${id})`;
          }
        } else if (el.tagName === 'BR') {
          result += '\n';
        } else if (el.tagName === 'DIV' && result && !result.endsWith('\n')) {
          result += '\n';
          Array.from(el.childNodes).forEach(traverse);
        } else {
          Array.from(el.childNodes).forEach(traverse);
        }
      }
    };

    Array.from(element.childNodes).forEach(traverse);
    return result;
  }, []);

  // Update the editor content when value changes
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    // Skip if composing (IME input)
    if (isComposingRef.current) {
      return;
    }

    // Skip if this is an internal update (from user typing)
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      previousValueRef.current = value;
      return;
    }

    // Check if the current DOM content matches the value
    const currentValue = htmlToValue(editorRef.current);
    
    // If they match and we're not forcing a render, no update needed
    if (currentValue === value && !forceRenderRef.current) {
      previousValueRef.current = value;
      return;
    }

    // Reset force render flag
    forceRenderRef.current = false;


    // Set flag to prevent handleInput from firing during DOM update
    isUpdatingDOMRef.current = true;

    // Value changed externally (or forced), update the DOM
    {
      // Save cursor position
      const selection = window.getSelection();
      let cursorPos = 0;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let absolutePos = 0;
        let found = false;

        const traverse = (node: Node) => {
          if (found) return;

          // Check if cursor is inside this text node
          if (node === range.startContainer && node.nodeType === Node.TEXT_NODE) {
            absolutePos += range.startOffset;
            found = true;
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            
            // Check if cursor is inside this element (before any children)
            // Note: startOffset for Element is child index
            if (node === range.startContainer) {
               // We handle this by checking index in the loop below
            }

            if (el.classList.contains('mention-pill')) {
              absolutePos += 1; // Count pill as 1 character
              return; // Don't traverse children of pill
            }
            
            for (let i = 0; i < node.childNodes.length; i++) {
              // Check if cursor is exactly at this child index
              if (node === range.startContainer && i === range.startOffset) {
                found = true;
                return;
              }
              
              traverse(node.childNodes[i]);
              if (found) return;
            }
            
            // Check if cursor is at the end of this element
            if (node === range.startContainer && range.startOffset === node.childNodes.length) {
               found = true;
               return;
            }
            
            if (el.tagName === 'BR') {
              absolutePos += 1;
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
             // Node was fully traversed
             absolutePos += node.textContent?.length || 0;
          }
        };
        
        if (editorRef.current) {
          traverse(editorRef.current);
          if (found) {
            cursorPos = absolutePos;
          }
        }
      }
      
      editorRef.current.innerHTML = valueToHTML(value);
      
      // Restore cursor position
      if (selection && cursorPos >= 0) {
        try {
          let remaining = cursorPos;
          let targetNode: Node | null = null;
          let targetOffset = 0;
          
          const findPosition = (node: Node): boolean => {
            if (node.nodeType === Node.TEXT_NODE) {
              const len = node.textContent?.length || 0;
              if (remaining <= len) {
                targetNode = node;
                targetOffset = remaining;
                return true;
              }
              remaining -= len;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              
              if (el.classList.contains('mention-pill')) {
                if (remaining === 0) {
                  // Cursor should be before this pill
                  // We need to set range before this node.
                  // But findPosition returns boolean to signal "found".
                  // We'll handle the range setting logic here or ensure targetNode is set correctly.
                  
                  // Since we can't easily return "before node" via targetNode/targetOffset (unless we use parent),
                  // let's handle it by setting a special flag or handling it in the loop.
                  // Actually, if remaining is 0, we want the position *before* this element.
                  // But the caller expects targetNode/targetOffset for setStart.
                  
                  // Alternative: set targetNode to parent, targetOffset to index.
                  targetNode = node.parentNode;
                  targetOffset = Array.from(node.parentNode?.childNodes || []).indexOf(node as ChildNode);
                  return true;
                }
                remaining -= 1;
                return false;
              }
              
              if (el.tagName === 'BR') {
                if (remaining === 0) {
                   targetNode = node.parentNode;
                   targetOffset = Array.from(node.parentNode?.childNodes || []).indexOf(node as ChildNode);
                   return true;
                }
                remaining -= 1;
              }

              for (let i = 0; i < node.childNodes.length; i++) {
                if (findPosition(node.childNodes[i])) return true;
              }
            }
            return false;
          };
          
          // We need to handle the case where cursor is at the very end (remaining > 0 but no more nodes)
          // handled by fallback.
          
          // But verify findPosition works for the "before pill" case.
          
          let found = false;
          for (let i = 0; i < editorRef.current.childNodes.length; i++) {
            if (findPosition(editorRef.current.childNodes[i])) {
                found = true;
                break;
            }
          }
          
          if (found && targetNode) {
            const newRange = document.createRange();
            newRange.setStart(targetNode, targetOffset);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
             // If remaining is > 0, maybe it matches the very end?
             // Or if remaining was 0 and we didn't find a node (empty editor?)
             if (remaining === 0 && editorRef.current.childNodes.length === 0) {
                 const newRange = document.createRange();
                 newRange.setStart(editorRef.current, 0);
                 newRange.collapse(true);
                 selection.removeAllRanges();
                 selection.addRange(newRange);
             } else {
                // Fallback: place cursor at the end
                const lastChild = editorRef.current.lastChild;
                if (lastChild) {
                  const newRange = document.createRange();
                  if (lastChild.nodeType === Node.TEXT_NODE) {
                    newRange.setStart(lastChild, lastChild.textContent?.length || 0);
                  } else {
                    newRange.setStartAfter(lastChild);
                  }
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
             }
          }
        } catch (e) {
          // Ignore cursor restoration errors
          console.warn('Failed to restore cursor position:', e);
        }
      }
      
      previousValueRef.current = value;
    }

    // Reset the updating flag after DOM operations complete
    isUpdatingDOMRef.current = false;
  }, [value, valueToHTML, htmlToValue]);

  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposingRef.current || isUpdatingDOMRef.current) {
      return;
    }
    
    isInternalUpdateRef.current = true;
    const newValue = htmlToValue(editorRef.current);
    onChange(newValue);
  }, [onChange, htmlToValue]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    insertAtCursor: (text: string, replaceQuery?: string) => {
      if (!editorRef.current) return;

      // Focus the editor first
      editorRef.current.focus();

      // Get current selection
      const selection = window.getSelection();
      if (!selection) return;

      // If no selection, place at the end
      if (selection.rangeCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.addRange(range);
      }

      const range = selection.getRangeAt(0);
      
      // If we need to replace a query (like "@app" when completing mention)
      if (replaceQuery) {
        // Expand the range backward to include the query text
        const container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) {
          const textContent = container.textContent || '';
          const cursorOffset = range.startOffset;
          const textBefore = textContent.substring(0, cursorOffset);
          
          // Check if the text before cursor ends with the query
          if (textBefore.endsWith(replaceQuery)) {
            const newStart = cursorOffset - replaceQuery.length;
            range.setStart(container, newStart);
          }
        }
      }
      
      // Delete any selected content or query text
      range.deleteContents();

      // Insert the text at cursor position
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      // Move cursor after the inserted text
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      // Force a reflow to ensure DOM is updated
      void editorRef.current.offsetHeight;

      // Extract the updated value and trigger onChange
      // Mark this as NOT an internal update so the useEffect will re-render with pills
      isInternalUpdateRef.current = false;
      forceRenderRef.current = true; // Force re-render to convert markdown to pills
      const newValue = htmlToValue(editorRef.current);
      onChange(newValue);
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }), [htmlToValue, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Handle remove button click
    if (target.classList.contains('mention-remove')) {
      e.preventDefault();
      e.stopPropagation();
      
      const mention = target.closest('.mention-pill') as HTMLElement;
      if (mention) {
        const id = mention.getAttribute('data-id') || mention.getAttribute('data-resource-id');
        const name = mention.getAttribute('data-name') || mention.getAttribute('data-doc-name');
        const type = mention.getAttribute('data-type') || (mention.classList.contains('doc-mention') ? 'doc' : 'user');
        
        // Remove the mention from the value
        if (id && name) {
          const mentionText = `@[${name}](${type}:${id})`;
          const newValue = value.replace(mentionText, '');
          onChange(newValue);
        }
      }
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle composition (IME input)
    if (e.nativeEvent.isComposing) {
      return;
    }

    // Handle backspace/delete for mention pills
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editorRef.current) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      const range = selection.getRangeAt(0);
      
      // Only handle if cursor is collapsed (no selection)
      if (!range.collapsed) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      const removeMention = (el: HTMLElement) => {
        if (el.classList && el.classList.contains('mention-pill')) {
          e.preventDefault();
          
          // If Backspace, we are after the element. Move cursor before it so restoration works correctly.
          // This ensures that after the element is removed, the cursor stays at the same relative position (now before the following content).
          if (e.key === 'Backspace') {
             const selection = window.getSelection();
             if (selection) {
                 const range = document.createRange();
                 range.setStartBefore(el);
                 range.collapse(true);
                 selection.removeAllRanges();
                 selection.addRange(range);
             }
          }
          
          // Find which occurrence this is
          const allPills = Array.from(editorRef.current?.querySelectorAll('.mention-pill') || []);
          const pillIndex = allPills.indexOf(el);
          
          if (pillIndex !== -1) {
            const mentions = parseMentions(value);
            if (mentions[pillIndex]) {
              const m = mentions[pillIndex];
              // Remove the mention range from the string
              const newValue = value.substring(0, m.startIndex) + value.substring(m.endIndex);
              onChange(newValue);
            }
          }
          return true;
        }
        return false;
      };

      if (e.key === 'Backspace') {
        // Check if there's a pill immediately before the cursor
        const container = range.startContainer;
        const offset = range.startOffset;

        // Case 1: Cursor is at the start of a text node, check previous sibling
        if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          const prevSibling = container.previousSibling;
          if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
            if (removeMention(prevSibling as HTMLElement)) return;
          }
        }

        // Case 2: Cursor is in an element (like div), check child before cursor
        if (container.nodeType === Node.ELEMENT_NODE && offset > 0) {
          const el = container as HTMLElement;
          const childBefore = el.childNodes[offset - 1];
          if (childBefore && childBefore.nodeType === Node.ELEMENT_NODE) {
            if (removeMention(childBefore as HTMLElement)) return;
          }
        }
      } else if (e.key === 'Delete') {
        // Check if there's a pill immediately after the cursor
        const container = range.startContainer;
        const offset = range.startOffset;

        // Case 1: Cursor is at the end of a text node, check next sibling
        if (container.nodeType === Node.TEXT_NODE) {
          const textContent = container.textContent || '';
          if (offset === textContent.length) {
            const nextSibling = container.nextSibling;
            if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE) {
              if (removeMention(nextSibling as HTMLElement)) return;
            }
          }
        }

        // Case 2: Cursor is in an element, check child after cursor
        if (container.nodeType === Node.ELEMENT_NODE) {
          const el = container as HTMLElement;
          if (offset < el.childNodes.length) {
            const childAfter = el.childNodes[offset];
            if (childAfter && childAfter.nodeType === Node.ELEMENT_NODE) {
              if (removeMention(childAfter as HTMLElement)) return;
            }
          }
        }
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown, value, onChange, parseMentions]);

  // Show placeholder when empty
  const showPlaceholder = !value && !isFocused;

  return (
    <div className={`relative flex-1 ${className}`}>
      {showPlaceholder && (
        <div className="absolute inset-0 px-3 py-2 text-gray-400 pointer-events-none flex items-center">
          {placeholder}
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => { 
          isComposingRef.current = false;
          handleInput();
        }}
        className="flex-1 px-3 py-2 border-0 focus:outline-none resize-none overflow-y-auto overflow-x-auto break-words overflow-wrap-anywhere"
        style={{ 
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}
        suppressContentEditableWarning
      />
    </div>
  );
});

RichTextInput.displayName = 'RichTextInput';


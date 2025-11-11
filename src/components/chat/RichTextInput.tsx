// src/components/chat/RichTextInput.tsx
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FileText, X } from 'lucide-react';

interface DocumentMention {
  name: string;
  resourceId: string;
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
  const parseMentions = useCallback((text: string): DocumentMention[] => {
    const mentions: DocumentMention[] = [];
    const regex = /@\[([^\]]+)\]\(doc:([^)]+)\)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      mentions.push({
        name: match[1],
        resourceId: match[2],
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
      html += `<span class="doc-mention inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-sm font-medium mx-1 border border-blue-200" contenteditable="false" data-resource-id="${mention.resourceId}" data-doc-name="${mention.name.replace(/"/g, '&quot;')}" style="user-select: none; white-space: nowrap; max-width: 240px;">` +
        `<span class="doc-mention-icon flex-shrink-0">📄</span>` +
        `<span class="doc-mention-name flex-1 overflow-hidden text-ellipsis whitespace-nowrap">${mention.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>` +
        `<button class="doc-mention-remove flex-shrink-0 w-4 h-4 flex items-center justify-center border-0 bg-transparent text-blue-600 cursor-pointer rounded opacity-70 hover:opacity-100 hover:bg-blue-600 hover:text-white transition-all text-lg leading-none p-0 m-0" type="button" aria-label="Remove document" style="font-size: 18px; line-height: 1;">×</button>` +
        `</span>`;

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
        
        if (el.classList.contains('doc-mention')) {
          const resourceId = el.getAttribute('data-resource-id');
          const docName = el.getAttribute('data-doc-name');
          if (resourceId && docName) {
            result += `@[${docName}](doc:${resourceId})`;
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
      let cursorNode: Node | null = null;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorNode = range.startContainer;
        cursorPos = range.startOffset;
        
        // Calculate absolute cursor position in text
        let node: Node | null = editorRef.current.firstChild;
        let absolutePos = 0;
        let found = false;
        
        const traverse = (n: Node): boolean => {
          if (n === cursorNode) {
            absolutePos += cursorPos;
            found = true;
            return true;
          }
          if (n.nodeType === Node.TEXT_NODE) {
            absolutePos += n.textContent?.length || 0;
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            const el = n as HTMLElement;
            if (el.classList.contains('doc-mention')) {
              // Skip mention pills in cursor calculation
              return false;
            }
            for (let i = 0; i < n.childNodes.length; i++) {
              if (traverse(n.childNodes[i])) return true;
            }
          }
          return false;
        };
        
        while (node && !found) {
          traverse(node);
          node = node.nextSibling;
        }
        
        cursorPos = absolutePos;
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
              if (!el.classList.contains('doc-mention')) {
                for (let i = 0; i < node.childNodes.length; i++) {
                  if (findPosition(node.childNodes[i])) return true;
                }
              }
            }
            return false;
          };
          
          for (let i = 0; i < editorRef.current.childNodes.length; i++) {
            if (findPosition(editorRef.current.childNodes[i])) break;
          }
          
          if (targetNode) {
            const newRange = document.createRange();
            newRange.setStart(targetNode, targetOffset);
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
  }), [handleInput, htmlToValue, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Handle remove button click
    if (target.classList.contains('doc-mention-remove')) {
      e.preventDefault();
      e.stopPropagation();
      
      const mention = target.closest('.doc-mention') as HTMLElement;
      if (mention) {
        const resourceId = mention.getAttribute('data-resource-id');
        const docName = mention.getAttribute('data-doc-name');
        
        // Remove the mention from the value
        if (resourceId && docName) {
          const mentionText = `@[${docName}](doc:${resourceId})`;
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

    // Handle backspace/delete for document pills
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

      if (e.key === 'Backspace') {
        // Check if there's a pill immediately before the cursor
        const container = range.startContainer;
        const offset = range.startOffset;

        // Case 1: Cursor is at the start of a text node, check previous sibling
        if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          const prevSibling = container.previousSibling;
          if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
            const prevEl = prevSibling as HTMLElement;
            if (prevEl.classList && prevEl.classList.contains('doc-mention')) {
              e.preventDefault();
              const resourceId = prevEl.getAttribute('data-resource-id');
              const docName = prevEl.getAttribute('data-doc-name');
              if (resourceId && docName) {
                const mentionText = `@[${docName}](doc:${resourceId})`;
                const newValue = value.replace(mentionText, '');
                onChange(newValue);
              }
              return;
            }
          }
        }

        // Case 2: Cursor is in an element (like div), check child before cursor
        if (container.nodeType === Node.ELEMENT_NODE && offset > 0) {
          const el = container as HTMLElement;
          const childBefore = el.childNodes[offset - 1];
          if (childBefore && childBefore.nodeType === Node.ELEMENT_NODE) {
            const childEl = childBefore as HTMLElement;
            if (childEl.classList && childEl.classList.contains('doc-mention')) {
              e.preventDefault();
              const resourceId = childEl.getAttribute('data-resource-id');
              const docName = childEl.getAttribute('data-doc-name');
              if (resourceId && docName) {
                const mentionText = `@[${docName}](doc:${resourceId})`;
                const newValue = value.replace(mentionText, '');
                onChange(newValue);
              }
              return;
            }
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
              const nextEl = nextSibling as HTMLElement;
              if (nextEl.classList && nextEl.classList.contains('doc-mention')) {
                e.preventDefault();
                const resourceId = nextEl.getAttribute('data-resource-id');
                const docName = nextEl.getAttribute('data-doc-name');
                if (resourceId && docName) {
                  const mentionText = `@[${docName}](doc:${resourceId})`;
                  const newValue = value.replace(mentionText, '');
                  onChange(newValue);
                }
                return;
              }
            }
          }
        }

        // Case 2: Cursor is in an element, check child after cursor
        if (container.nodeType === Node.ELEMENT_NODE) {
          const el = container as HTMLElement;
          if (offset < el.childNodes.length) {
            const childAfter = el.childNodes[offset];
            if (childAfter && childAfter.nodeType === Node.ELEMENT_NODE) {
              const childEl = childAfter as HTMLElement;
              if (childEl.classList && childEl.classList.contains('doc-mention')) {
                e.preventDefault();
                const resourceId = childEl.getAttribute('data-resource-id');
                const docName = childEl.getAttribute('data-doc-name');
                if (resourceId && docName) {
                  const mentionText = `@[${docName}](doc:${resourceId})`;
                  const newValue = value.replace(mentionText, '');
                  onChange(newValue);
                }
                return;
              }
            }
          }
        }
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown, value, onChange]);

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


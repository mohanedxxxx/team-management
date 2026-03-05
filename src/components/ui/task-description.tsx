'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface TaskDescriptionProps {
  description: string | null;
  maxLines?: number;
  className?: string;
}

// Function to detect and make links clickable
function parseTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  
  text.replace(urlRegex, (match, offset) => {
    if (offset > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, offset)}</span>);
    }
    
    parts.push(
      <a
        key={key++}
        href={match}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {match.length > 40 ? match.slice(0, 40) + '...' : match}
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
    
    lastIndex = offset + match.length;
    return match;
  });
  
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  
  return parts.length > 0 ? parts : text;
}

export function TaskDescription({ 
  description, 
  maxLines = 2, 
  className = '' 
}: TaskDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!description) return null;
  
  const isLong = description.length > 100 || description.split('\n').length > 2;
  
  return (
    <div className={`space-y-1 ${className}`}>
      <div className={`text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words ${!isExpanded ? `line-clamp-${maxLines}` : ''}`}>
        {parseTextWithLinks(description)}
      </div>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 ml-1" />
              عرض أقل
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 ml-1" />
              عرض المزيد
            </>
          )}
        </Button>
      )}
    </div>
  );
}

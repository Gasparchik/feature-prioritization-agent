import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import Drawer from '../ui/Drawer'
import { Sparkle, Send } from '../ui/Icons'

interface Message {
  role: 'agent' | 'user'
  text: string
  refs?: string[]
}

const SUGGESTIONS = [
  'Объясни, почему верхний кластер получил такой RICE',
  'Сравни два верхних кластера',
  'Перегенерируй PRD с уклоном в мобильную аудиторию',
  'Какие кластеры стоит объединить?',
]

function mockReply(q: string): Message {
  const lower = q.toLowerCase()
  if (lower.includes('приоритет') || lower.includes('rice') || lower.includes('топ')) {
    return {
      role: 'agent',
      text: 'Топ-кластер получил высокий RICE благодаря большому охвату, значительному влиянию на пользователей и относительно низким затратам на реализацию. Confidence высокий — запрос воспроизводим на разных устройствах.',
      refs: ['RICE = R × I × (C/100) / E'],
    }
  }
  if (lower.includes('сравни') || lower.includes('compare')) {
    return {
      role: 'agent',
      text: 'Если сравнивать два верхних кластера: первый выигрывает по охвату и уверенности, второй — по меньшему Effort. Рекомендую брать первый как quick-win первого спринта.',
    }
  }
  if (lower.includes('объедин')) {
    return {
      role: 'agent',
      text: 'Посмотрите на кластеры с похожими описаниями и небольшим числом элементов — их стоит объединить. Используйте кнопку «Объединить» в карточке кластера.',
    }
  }
  return {
    role: 'agent',
    text: 'Понял. Работаю в демо-режиме. Могу подробно объяснить любую RICE-оценку, сравнить кластеры или предложить изменения к PRD. Что вас интересует?',
  }
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2.5">
      <div className="w-6 h-6 shrink-0 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-500 dark:text-brand-400 inline-flex items-center justify-center">
        <Sparkle size={12} />
      </div>
      <div className="px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[10px] inline-flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-[5px] h-[5px] rounded-full bg-neutral-400 animate-agent-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function ChatBubble({ role, text, refs }: Message) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-6 h-6 shrink-0 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-500 dark:text-brand-400 inline-flex items-center justify-center">
          <Sparkle size={12} />
        </div>
      )}
      <div
        className={[
          'max-w-[85%] px-3 py-2 rounded-[10px] text-[13.5px] leading-[1.5] whitespace-pre-wrap',
          isUser
            ? 'bg-ink text-white dark:bg-neutral-100 dark:text-ink'
            : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
        ].join(' ')}
      >
        {text}
        {refs && (
          <div className="mt-2 flex flex-wrap gap-1">
            {refs.map(r => (
              <span key={r} className="pill font-mono text-[10px] text-brand-700 dark:text-brand-300">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentChat() {
  const { chatOpen, setChatOpen } = useAppStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Привет! Я готов помочь с анализом кластеров, RICE-оценками и PRD. Спросите что-нибудь.' }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [chatOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, thinking])

  const send = (text: string) => {
    if (!text.trim()) return
    setMessages(m => [...m, { role: 'user', text }])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      setMessages(m => [...m, mockReply(text)])
      setThinking(false)
    }, 900 + Math.random() * 600)
  }

  return (
    <Drawer
      open={chatOpen}
      onClose={() => setChatOpen(false)}
      width={460}
      title={
        <div className="flex items-center gap-2">
          <Sparkle size={14} />
          <span>Agent</span>
          <span className="pill font-mono text-[10px] ml-1">claude-haiku-4-5</span>
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pb-3 min-h-0">
          {messages.map((m, i) => <ChatBubble key={i} {...m} />)}
          {thinking && <ThinkingBubble />}
        </div>

        {/* Suggestions */}
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-1.5 my-2.5">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-2.5 py-1.5 text-[11.5px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-neutral-600 dark:text-neutral-400 cursor-pointer hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="sticky bottom-0 pt-2">
          <div className="flex items-end gap-1.5 p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-[10px]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
              }}
              placeholder="Спросить агента…"
              rows={1}
              className="flex-1 border-none outline-none bg-transparent resize-none text-[13.5px] leading-[1.45] max-h-[100px] font-[inherit]"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className={[
                'w-[26px] h-[26px] rounded-md inline-flex items-center justify-center border-none transition-colors',
                input.trim()
                  ? 'bg-ink dark:bg-neutral-100 text-white dark:text-ink cursor-pointer'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed',
              ].join(' ')}
            >
              <Send size={12} />
            </button>
          </div>
          <div className="flex justify-between mt-1.5 text-[10.5px] text-neutral-400 font-mono">
            <span>Enter — отправить · Shift+Enter — перенос</span>
            <span>⌘K — закрыть</span>
          </div>
        </div>
      </div>
    </Drawer>
  )
}

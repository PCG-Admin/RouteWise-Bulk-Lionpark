'use client';

import { useState, useRef, useEffect } from 'react';
import PanelCard from '@/components/reports/PanelCard';
import { Sparkles, Send, ArrowRight, BarChart3, Truck, Clock, AlertTriangle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQueries = [
  { icon: BarChart3, label: 'What is today\'s total tonnage?', category: 'Overview' },
  { icon: Truck, label: 'Which trucks are delayed?', category: 'Logistics' },
  { icon: Clock, label: 'Average delivery time this week?', category: 'Analytics' },
  { icon: AlertTriangle, label: 'Show critical alerts', category: 'Alerts' },
  { icon: BarChart3, label: 'Top performing mine by volume?', category: 'Reports' },
  { icon: Truck, label: 'Transporter utilization rates?', category: 'Logistics' },
];

const mockResponses: Record<string, string> = {
  'What is today\'s total tonnage?': 'Based on current data, today\'s total dispatched tonnage is **2,847 tonnes** across 42 active orders. Mamatwan mine leads with 1,245 tonnes (43.7%), followed by Wessels at 892 tonnes (31.3%) and Gloria at 710 tonnes (24.9%). This is 8.2% above the daily target of 2,630 tonnes.',
  'Which trucks are delayed?': 'Currently, **3 trucks** are flagged as delayed:\n\n1. **BC-TRK-012** - 47 min behind schedule (en route to Lions staging)\n2. **BC-TRK-034** - 32 min delay (loading at Mamatwan)\n3. **BC-TRK-051** - 28 min delay (convoy to BC)\n\nThe primary cause appears to be congestion at the Mamatwan loading bay. Consider rerouting BC-TRK-034 to Bay 2.',
  'Average delivery time this week?': 'The average delivery time this week is **6.4 hours** (mine to BC port), which is 12% faster than last week\'s average of 7.3 hours. Key improvements:\n\n- **Loading time:** Down 18 min to 42 min avg\n- **Transit time:** Down 22 min to 3.8 hrs avg\n- **Staging wait:** Down 8 min to 1.1 hrs avg\n\nThe convoy scheduling optimization implemented Monday is showing strong results.',
  'Show critical alerts': 'There are **4 critical alerts** currently active:\n\n1. Stockpile at Wessels approaching 95% capacity (action required)\n2. Truck BC-TRK-012 overdue by 47 minutes\n3. Transporter KZN Haulage below 70% compliance rate\n4. Vessel MV Coral loading deadline in 18 hours with 340t shortfall\n\nRecommend prioritizing the vessel shortfall - redirect 4 additional trucks from Mamatwan to meet deadline.',
};

export default function AIAskTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(text?: string) {
    const query = text || input.trim();
    if (!query) return;

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = mockResponses[query] ||
        `Based on the current operational data, I can see that your query relates to "${query}". Here's a summary:\n\nThe system shows **42 active orders** across 3 mines with a total fleet of 65 trucks currently deployed. Key metrics are within normal operating parameters. For more specific analysis, try asking about a particular mine, transporter, or time period.`;
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 1200);
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        <PanelCard
          title="CONVERSATION"
          className="flex-1 flex flex-col min-h-0"
          noPadding
          action={
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-600" />
              <span className="font-sans text-[10px] text-gray-600">AI-POWERED</span>
            </div>
          }
        >
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 rounded-md bg-amber-100 flex items-center justify-center">
                  <Sparkles size={28} className="text-amber-600" />
                </div>
                <div className="text-center">
                  <h3 className="font-sans font-bold text-2xl tracking-[0.1em] text-gray-900 mb-2">
                    ASK ANYTHING
                  </h3>
                  <p className="font-sans text-sm text-gray-700 max-w-md">
                    Query your operations data using natural language. Get instant insights on orders, logistics, stockpiles, and more.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-md px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-50 text-gray-900'
                }`}>
                  <div className="font-sans text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                        : part
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your operations..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 font-sans focus:outline-none focus:border-amber-600"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="bg-amber-600 text-white rounded-md p-2.5 hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </PanelCard>
      </div>

      {/* Suggested queries sidebar */}
      <div className="w-[280px] flex-shrink-0">
        <PanelCard title="SUGGESTED QUERIES">
          <div className="flex flex-col gap-2">
            {suggestedQueries.map((q, i) => {
              const Icon = q.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSend(q.label)}
                  className="flex items-start gap-3 p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
                >
                  <Icon size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-sans text-[9px] uppercase tracking-wider text-gray-600 block mb-0.5">
                      {q.category}
                    </span>
                    <span className="font-sans text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                      {q.label}
                    </span>
                  </div>
                  <ArrowRight size={12} className="text-gray-400 group-hover:text-amber-600 transition-colors mt-0.5 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

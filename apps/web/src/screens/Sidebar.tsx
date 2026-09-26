import { useQuery } from '@tanstack/react-query';
import { Check, MessageCircle, Send, UserPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { net } from '../game/net';
import { api, type Friend, type Me } from '../lib/api';
import { qk } from '../lib/queries';
import { useUi } from '../lib/store';
import { EmptyState, ErrorState, Progress } from '../ui/primitives';

export function Sidebar({ me }: { me: Me }) {
  const [tab, setTab] = useState<'chat' | 'friends'>('chat');
  return (
    <aside className="sidebar" aria-label="Social">
      {!me.onboarding.completed ? <Onboarding me={me} /> : null}
      <div className="side-tabs">
        <div className="tabs" role="tablist">
          <button
            role="tab"
            className="tab"
            style={{ flex: 1 }}
            aria-selected={tab === 'chat'}
            onClick={() => setTab('chat')}
          >
            <MessageCircle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            Chat
          </button>
          <button
            role="tab"
            className="tab"
            style={{ flex: 1 }}
            aria-selected={tab === 'friends'}
            onClick={() => setTab('friends')}
          >
            <Users size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            Friends
          </button>
        </div>
      </div>
      <div className="side-section">{tab === 'chat' ? <Chat /> : <FriendsList />}</div>
    </aside>
  );
}

function Onboarding({ me }: { me: Me }) {
  const done = me.onboarding.steps.filter((s) => s.done).length;
  const total = me.onboarding.steps.length;
  return (
    <section className="onboarding" aria-label="Newcomer checklist">
      <h3>
        Newcomer checklist
        <span className="pill pill-primary">
          {done}/{total}
        </span>
      </h3>
      <div style={{ margin: '10px 0 0' }}>
        <Progress value={done} max={total} />
      </div>
      <ul className="checklist">
        {me.onboarding.steps.map((s) => (
          <li key={s.id} className={s.done ? 'done' : ''}>
            <span className="check">{s.done ? <Check size={12} strokeWidth={3} /> : null}</span>
            {s.label}
          </li>
        ))}
      </ul>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Finish all steps for {me.onboarding.reward.coin} Coin and {me.onboarding.reward.fame} Fame. It also
        counts toward AI reward eligibility.
      </p>
    </section>
  );
}

function Chat() {
  const chat = useUi((s) => s.chat);
  const connection = useUi((s) => s.connection);
  const room = useUi((s) => s.room);
  const inspect = useUi((s) => s.inspect);
  const [text, setText] = useState('');
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);
  const online = connection === 'online';
  return (
    <>
      <div className="chat-log" ref={log} aria-live="polite" aria-label={`Chat in ${room.label}`}>
        {chat.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Chat is quiet. Press <span className="kbd">Enter</span> and say hi — people nearby will see a
            bubble over your head.
          </p>
        ) : (
          chat.map((c) => (
            <div key={c.id} className="chat-line">
              <time>{new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
              <button onClick={() => inspect(c.userId)}>{c.name}</button>: {c.text}
            </div>
          ))
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || !online) return;
          net.send('chat', { text });
          setText('');
        }}
      >
        <input
          id="chat-input"
          className="input"
          placeholder={online ? 'Say something…' : 'Reconnecting…'}
          value={text}
          maxLength={140}
          disabled={!online}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
          aria-label="Chat message"
        />
        <button
          className="btn btn-primary"
          style={{ width: 40, padding: 0 }}
          aria-label="Send"
          disabled={!online || !text.trim()}
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}

function FriendsList() {
  const friends = useQuery({
    queryKey: qk.friends,
    queryFn: () => api<Friend[]>('/friends'),
    refetchInterval: 20_000,
  });
  const inspect = useUi((s) => s.inspect);
  if (friends.isPending) return <div className="skeleton" style={{ margin: 16, height: 120 }} />;
  if (friends.isError) return <ErrorState error={friends.error} onRetry={() => void friends.refetch()} />;
  if (!friends.data.length)
    return (
      <EmptyState
        icon={<UserPlus size={22} />}
        title="No friends yet"
        body="Click on any player in town or in chat to see their card and add them as a friend."
      />
    );
  const sorted = [...friends.data].sort((a, b) => Number(b.online) - Number(a.online));
  return (
    <div style={{ padding: 8, overflow: 'auto' }}>
      {sorted.map((f) => (
        <div
          key={f.id}
          className="friend-row"
          role="button"
          tabIndex={0}
          onClick={() => inspect(f.id)}
          onKeyDown={(e) => e.key === 'Enter' && inspect(f.id)}
        >
          <span className={`presence ${f.online ? 'on' : ''}`} aria-label={f.online ? 'Online' : 'Offline'} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{f.displayName}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {f.online ? (f.location ?? 'Online') : 'Offline'}
              {f.mutual ? ' · Mutual' : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

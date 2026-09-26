import { ZONES, type ZoneId } from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Armchair,
  Bot,
  CalendarDays,
  ChevronDown,
  Home,
  LogOut,
  Map as MapIcon,
  Receipt,
  Shield,
  Shirt,
  Smile,
  Sparkles,
  Star,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { avatarPortrait } from '../art/avatar';
import { GameCanvas } from '../game/GameCanvas';
import { net } from '../game/net';
import { api, num, session, usd, type EventHub, type Me } from '../lib/api';
import { qk } from '../lib/queries';
import { play } from '../lib/sound';
import { useUi, type Panel } from '../lib/store';
import { CafeActivity, DeliveryHud, FishingActivity, startDelivery } from './activities';
import { AiPanel } from './panels/AiPanel';
import { ApartmentEditor } from './panels/ApartmentEditor';
import { ApartmentsPanel } from './panels/ApartmentsPanel';
import { EventsPanel } from './panels/EventsPanel';
import { LedgerPanel } from './panels/LedgerPanel';
import { PlayerCardModal } from './panels/PlayerCard';
import { ShopPanel } from './panels/ShopPanel';
import { WardrobePanel } from './panels/WardrobePanel';
import { Sidebar } from './Sidebar';
import { Brand } from './Brand';
import { Button, CoinIcon, Spinner } from '../ui/primitives';

const EMOTES = [
  ['wave', '👋', 'Wave'],
  ['laugh', '😂', 'Laugh'],
  ['heart', '❤️', 'Love'],
  ['shock', '😱', 'Shock'],
  ['dance', '💃', 'Dance'],
  ['sleep', '💤', 'Sleep'],
  ['angry', '💢', 'Grr'],
  ['thumbs', '👍', 'Nice'],
] as const;

export function GameScreen({ me, onSignedOut }: { me: Me; onSignedOut: () => void }) {
  const panel = useUi((s) => s.panel);
  const setPanel = useUi((s) => s.setPanel);
  const activity = useUi((s) => s.activity);
  const room = useUi((s) => s.room);

  useEffect(() => {
    void net.goTown();
    return () => void net.disconnect();
  }, []);

  // Keyboard shortcuts for non-game UI.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (document.querySelector('.backdrop')) return;
      if (e.key === 'Enter' && !panel && !activity) {
        e.preventDefault();
        document.getElementById('chat-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, activity]);

  return (
    <div className="shell">
      <TopBar me={me} onSignedOut={onSignedOut} />
      <div className="stage">
        <main className="world" aria-label={room.label}>
          <GameCanvas />
          <WorldHud me={me} />
          {activity === 'fishing' ? <FishingActivity /> : null}
          {activity === 'cafe' ? <CafeActivity /> : null}
          <ConnectionOverlay />
          {room.kind === 'apartment' && room.ownerId === me.id ? <ApartmentEditor /> : null}
          {panel === 'shop-fashion' ? <ShopPanel kind="clothing" onClose={() => setPanel(null)} /> : null}
          {panel === 'shop-furniture' ? <ShopPanel kind="furniture" onClose={() => setPanel(null)} /> : null}
          {panel === 'wardrobe' ? <WardrobePanel me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'events' ? <EventsPanel onClose={() => setPanel(null)} /> : null}
          {panel === 'ai' ? <AiPanel onClose={() => setPanel(null)} /> : null}
          {panel === 'apartments' ? <ApartmentsPanel me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'ledger' ? <LedgerPanel onClose={() => setPanel(null)} /> : null}
        </main>
        <Sidebar me={me} />
      </div>
      <PlayerCardModal />
    </div>
  );
}

function TopBar({ me, onSignedOut }: { me: Me; onSignedOut: () => void }) {
  const panel = useUi((s) => s.panel);
  const setPanel = useUi((s) => s.setPanel);
  const room = useUi((s) => s.room);
  const muted = useUi((s) => s.muted);
  const setMuted = useUi((s) => s.setMuted);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);

  const prevCoin = useRef(me.balances.coin);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (me.balances.coin > prevCoin.current) {
      setBump(true);
      play('coin');
      const t = setTimeout(() => setBump(false), 450);
      prevCoin.current = me.balances.coin;
      return () => clearTimeout(t);
    }
    prevCoin.current = me.balances.coin;
  }, [me.balances.coin]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const nav: {
    id: Panel | 'town' | 'home' | 'admin';
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    current: boolean;
  }[] = [
    {
      id: 'town',
      label: 'Town',
      icon: <MapIcon size={17} />,
      onClick: () => {
        setPanel(null);
        if (room.kind !== 'town') void net.goTown();
      },
      current: !panel && room.kind === 'town',
    },
    {
      id: 'events',
      label: 'Events',
      icon: <CalendarDays size={17} />,
      onClick: () => setPanel('events'),
      current: panel === 'events',
    },
    {
      id: 'shop-fashion',
      label: 'Shop',
      icon: <Shirt size={17} />,
      onClick: () => setPanel('shop-fashion'),
      current: panel === 'shop-fashion' || panel === 'shop-furniture',
    },
    {
      id: 'home',
      label: 'Apartment',
      icon: <Home size={17} />,
      onClick: () => {
        setPanel(null);
        void net.goApartment(me.id, 'Your apartment');
      },
      current: !panel && room.kind === 'apartment' && room.ownerId === me.id,
    },
    {
      id: 'ai',
      label: 'AI Rewards',
      icon: <Bot size={17} />,
      onClick: () => setPanel('ai'),
      current: panel === 'ai',
    },
    {
      id: 'apartments',
      label: 'Visit',
      icon: <Users size={17} />,
      onClick: () => setPanel('apartments'),
      current: panel === 'apartments',
    },
    ...(me.role === 'admin'
      ? [
          {
            id: 'admin' as const,
            label: 'Admin',
            icon: <Shield size={17} color="var(--accent-coral, #ff7a60)" />,
            onClick: () => navigate('/admin'),
            current: false,
          },
        ]
      : []),
  ];

  async function signOut() {
    await api('/auth/logout', { body: {} }).catch(() => undefined);
    await net.disconnect();
    session.clear();
    qc.clear();
    onSignedOut();
  }

  return (
    <header className="topbar">
      <Brand />
      <nav className="nav" aria-label="Main">
        {nav.map((n) => (
          <button key={n.id} className="nav-btn" aria-current={n.current} onClick={n.onClick} title={n.label}>
            {n.icon}
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="balances">
        <button
          className={`balance balance-coin ${bump ? 'bump' : ''}`}
          onClick={() => setPanel('ledger')}
          title="Coin — spend in shops, redeem for AI Credit"
        >
          <span className="balance-icon">
            <CoinIcon />
          </span>
          <span>
            <div className="balance-value">{num(me.balances.coin)}</div>
            <div className="balance-label">Coin</div>
          </span>
        </button>
        <button
          className="balance balance-fame"
          onClick={() => setPanel('ledger')}
          title="Fame — earned from activities and events"
        >
          <span className="balance-icon">
            <Star size={14} />
          </span>
          <span>
            <div className="balance-value">{num(me.balances.fame)}</div>
            <div className="balance-label">Fame</div>
          </span>
        </button>
        <button
          className="balance balance-ai"
          onClick={() => setPanel('ai')}
          title="AI Credit — allocate to API keys"
        >
          <span className="balance-icon">
            <Sparkles size={14} />
          </span>
          <span>
            <div className="balance-value">{usd(me.balances.aiCreditCents)}</div>
            <div className="balance-label">AI Credit</div>
          </span>
        </button>
      </div>
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          className="avatar-btn"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          <span className="avatar-chip">
            <img src={avatarPortrait(me.appearance, 2)} alt="" />
          </span>
          <ChevronDown size={16} />
        </button>
        {menu ? (
          <div className="menu" role="menu">
            <div style={{ padding: '8px 10px 10px' }}>
              <strong>{me.displayName}</strong>
              <div className="muted" style={{ fontSize: 12 }}>
                {me.title}
              </div>
            </div>
            <div className="menu-sep" />
            <button
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setMenu(false);
                setPanel('wardrobe');
              }}
            >
              <Shirt size={16} /> Wardrobe & profile
            </button>
            <button
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setMenu(false);
                setPanel('shop-furniture');
              }}
            >
              <Armchair size={16} /> Furniture shop
            </button>
            <button
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setMenu(false);
                setPanel('ledger');
              }}
            >
              <Receipt size={16} /> Transaction history
            </button>
            <button role="menuitem" className="menu-item" onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} Sound {muted ? 'off' : 'on'}
            </button>
            {me.role === 'admin' ? (
              <button role="menuitem" className="menu-item" onClick={() => navigate('/admin')}>
                <Shield size={16} /> Admin console
              </button>
            ) : null}
            <div className="menu-sep" />
            <button role="menuitem" className="menu-item" onClick={() => void signOut()}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

const ZONE_ACTIONS: Partial<Record<ZoneId, { cta: string; hint: string }>> = {
  pier: { cta: 'Cast a line', hint: 'Fish for Coin and Fame' },
  delivery: { cta: 'Take an order', hint: 'Deliver a parcel across town' },
  cafe: { cta: 'Start a shift', hint: 'Make drinks for odd customers' },
  fashion: { cta: 'Browse clothes', hint: 'Hats, tops and questionable glasses' },
  furniture: { cta: 'Browse furniture', hint: 'Things for your apartment' },
  apartments: { cta: 'Go home', hint: 'Enter your apartment' },
  events: { cta: 'Open event board', hint: 'Join the next event' },
  ai_kiosk: { cta: 'Open AI Rewards', hint: 'Redeem Coin for AI quota' },
};

function WorldHud({ me }: { me: Me }) {
  const zone = useUi((s) => s.zone);
  const room = useUi((s) => s.room);
  const panel = useUi((s) => s.panel);
  const activity = useUi((s) => s.activity);
  const delivery = useUi((s) => s.delivery);
  const setPanel = useUi((s) => s.setPanel);
  const setActivity = useUi((s) => s.setActivity);
  const [emotes, setEmotes] = useState(false);
  const events = useQuery({
    queryKey: qk.events,
    queryFn: () => api<EventHub>('/events'),
    refetchInterval: 10_000,
  });
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const action = room.kind === 'town' && zone ? ZONE_ACTIONS[zone] : undefined;
  const zoneLabel = zone ? ZONES.find((z) => z.id === zone)?.label : null;
  const deliveringHere = delivery && zone === delivery.destination;

  function runAction() {
    if (!zone) return;
    play('click');
    switch (zone) {
      case 'pier':
        return setActivity('fishing');
      case 'cafe':
        return setActivity('cafe');
      case 'delivery':
        return void startDelivery();
      case 'fashion':
        return setPanel('shop-fashion');
      case 'furniture':
        return setPanel('shop-furniture');
      case 'apartments':
        return void net.goApartment(me.id, 'Your apartment');
      case 'events':
        return setPanel('events');
      case 'ai_kiosk':
        return setPanel('ai');
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (panel || activity || document.querySelector('.backdrop')) return;
      if ((e.key === 'e' || e.key === 'E') && action && !delivery) runAction();
      if (e.key === 'q' || e.key === 'Q') setEmotes((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ev = events.data?.current;
  const now = Date.now();
  const serverSkew = events.data ? Date.parse(events.data.serverTime) - (events.dataUpdatedAt || now) : 0;
  const remaining = ev
    ? Math.max(0, Date.parse(ev.status === 'running' ? ev.endsAt : ev.startsAt) - (now + serverSkew))
    : 0;
  const mmss = `${Math.floor(remaining / 60000)}:${String(Math.floor(remaining / 1000) % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="hud-top">
        <div className="row">
          <div className="location-chip">
            <span className="dot" />
            {room.kind === 'apartment' ? room.label : (zoneLabel ?? 'Town')}
          </div>
          {room.kind === 'apartment' ? (
            <Button size="sm" onClick={() => void net.goTown()}>
              <MapIcon size={15} /> Back to town
            </Button>
          ) : null}
        </div>
        {ev ? (
          <div className="event-chip">
            <span>
              {ev.status === 'running' ? '🦆 ' : ''}
              {ev.title} {ev.status === 'running' ? 'ends in' : 'starts in'} <strong>{mmss}</strong>
            </span>
            <Button size="sm" variant={ev.joined ? 'secondary' : 'reward'} onClick={() => setPanel('events')}>
              {ev.joined ? (ev.status === 'running' ? `Score ${ev.myScore}` : 'Joined') : 'Join'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hud-bottom">
        {delivery ? <DeliveryHud /> : null}
        {action && !activity && !panel && !(delivery && !deliveringHere) ? (
          <div className="prompt" role="status">
            <div className="prompt-text">
              <strong>{zoneLabel}</strong>
              <span>{action.hint}</span>
            </div>
            <Button variant="primary" onClick={runAction}>
              <span
                className="kbd"
                style={{
                  background: 'rgba(255,255,255,.2)',
                  borderColor: 'rgba(255,255,255,.3)',
                  color: '#fff',
                }}
              >
                E
              </span>
              {action.cta}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hud-tools">
        <div style={{ position: 'relative' }}>
          <button
            className="hud-tool"
            aria-pressed={emotes}
            aria-label="Emotes (Q)"
            title="Emotes (Q)"
            onClick={() => setEmotes((v) => !v)}
          >
            <Smile size={20} />
          </button>
          {emotes ? (
            <div className="emote-wheel" role="menu" aria-label="Emotes">
              {EMOTES.map(([id, icon, label]) => (
                <button
                  key={id}
                  role="menuitem"
                  onClick={() => {
                    net.send('emote', { emote: id });
                    setEmotes(false);
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          className="hud-tool"
          aria-label="Wardrobe"
          title="Wardrobe"
          onClick={() => setPanel('wardrobe')}
        >
          <Shirt size={20} />
        </button>
      </div>

      <div className="help-card" aria-hidden>
        <span className="kbd">W</span>
        <span className="kbd">A</span>
        <span className="kbd">S</span>
        <span className="kbd">D</span> move
        <span className="kbd">E</span> interact
        <span className="kbd">Enter</span> chat
      </div>
    </>
  );
}

function ConnectionOverlay() {
  const connection = useUi((s) => s.connection);
  if (connection === 'online') return null;
  const offline = connection === 'offline';
  return (
    <div className="conn-banner" role="alert">
      <div className="conn-card">
        {offline ? <WifiOff size={28} /> : <Spinner />}
        <h3>
          {connection === 'connecting'
            ? 'Entering town…'
            : offline
              ? 'You are disconnected'
              : 'Reconnecting…'}
        </h3>
        <p className="muted">
          {connection === 'connecting'
            ? 'Loading the neighbourhood.'
            : offline
              ? 'This session was closed. You may have opened the game somewhere else.'
              : 'Lost connection to the town server. Your progress is saved on the server.'}
        </p>
        {connection !== 'connecting' ? (
          <Button variant="primary" onClick={() => net.retryNow()}>
            Reconnect now
          </Button>
        ) : null}
      </div>
    </div>
  );
}

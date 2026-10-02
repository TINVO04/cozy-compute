import { ZONES, type ZoneId } from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Compass,
  LogOut,
  Map as MapIcon,
  Package,
  Receipt,
  Shield,
  Smile,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  WifiOff,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { avatarPortrait } from '../art/avatar';
import { GameCanvas } from '../game/GameCanvas';
import { net } from '../game/net';
import { townFishingController } from '../game/scenes';
import { api, num, session, usd, type EventHub, type Me } from '../lib/api';
import { qk } from '../lib/queries';
import { play } from '../lib/sound';
import { useUi, type Panel } from '../lib/store';
import { CafeActivity, DeliveryHud, FishingActivity, startDelivery } from './activities';
import { AiPanel } from './panels/AiPanel';
import { ApartmentEditor } from './panels/ApartmentEditor';
import { ApartmentGuestView } from './panels/ApartmentGuestView';
import { ApartmentsPanel } from './panels/ApartmentsPanel';
import { EventsPanel } from './panels/EventsPanel';
import { LedgerPanel } from './panels/LedgerPanel';
import { PlayerCardModal } from './panels/PlayerCard';
import { ShopPanel } from './panels/ShopPanel';
import { FishingShopPanel } from './panels/FishingShopPanel';
import { BackpackPanel } from './panels/BackpackPanel';
import { FishCompendium } from './panels/FishCompendium';
import { BidaArenaPanel } from './panels/BidaArenaPanel';
import { CyberNetPcPanel } from './panels/CyberNetPcPanel';
import { FarmPasswordModal } from './panels/FarmPasswordModal';
import { FarmPlotModal } from './panels/FarmPlotModal';
import { FarmSiloPanel } from './panels/FarmSiloPanel';
import { FarmShopPanel } from './panels/FarmShopPanel';
import { Sidebar } from './Sidebar';
import { Brand } from './Brand';
import { Button, CoinIcon, Spinner } from '../ui/primitives';

const EMOTES = [
  ['wave', '👋', 'Vẫy tay'],
  ['laugh', '😂', 'Cười lớn'],
  ['heart', '❤️', 'Yêu thích'],
  ['shock', '😱', 'Bất ngờ'],
  ['dance', '💃', 'Nhảy múa'],
  ['sleep', '💤', 'Ngủ say'],
  ['angry', '💢', 'Tức giận'],
  ['thumbs', '👍', 'Tuyệt vời'],
] as const;

export function GameScreen({ me, onSignedOut }: { me: Me; onSignedOut: () => void }) {
  const panel = useUi((s) => s.panel);
  const setPanel = useUi((s) => s.setPanel);
  const activity = useUi((s) => s.activity);
  const room = useUi((s) => s.room);

  useEffect(() => {
    useUi.getState().setMyUserId(me.id);
    void net.goTown();
    return () => void net.disconnect();
  }, [me.id]);

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
      if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (activity) {
          townFishingController?.cleanup();
          useUi.getState().setActivity(null);
        }
        setPanel(panel === 'backpack' ? null : 'backpack');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, activity, setPanel]);

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
          {room.kind === 'apartment' && room.ownerId && room.ownerId !== me.id ? (
            <ApartmentGuestView key={room.ownerId} ownerId={room.ownerId} />
          ) : null}
          {panel === 'shop-fashion' ? <ShopPanel kind="clothing" onClose={() => setPanel(null)} /> : null}
          {panel === 'shop-furniture' ? <ShopPanel kind="furniture" onClose={() => setPanel(null)} /> : null}
          {panel === 'shop-rods' ? <FishingShopPanel me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'backpack' ? (
            <BackpackPanel me={me} initialTab="backpack" onClose={() => setPanel(null)} />
          ) : null}
          {panel === 'tackle' ? (
            <BackpackPanel me={me} initialTab="tackle" onClose={() => setPanel(null)} />
          ) : null}
          {panel === 'wardrobe' ? (
            <BackpackPanel me={me} initialTab="wardrobe" onClose={() => setPanel(null)} />
          ) : null}
          {panel === 'profile' ? (
            <BackpackPanel me={me} initialTab="profile" onClose={() => setPanel(null)} />
          ) : null}
          {panel === 'events' ? <EventsPanel onClose={() => setPanel(null)} /> : null}
          {panel === 'ai' ? <AiPanel onClose={() => setPanel(null)} /> : null}
          {panel === 'apartments' ? <ApartmentsPanel me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'ledger' ? <LedgerPanel onClose={() => setPanel(null)} /> : null}
          {panel === 'fishdex' ? <FishCompendium onClose={() => setPanel(null)} /> : null}
          {panel === 'bida' ? <BidaArenaPanel me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'cybernet' ? <CyberNetPcPanel me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'farm-password' ? <FarmPasswordModal onClose={() => setPanel(null)} /> : null}
          {panel === 'farm-plot' ? <FarmPlotModal me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'farm-silo' ? <FarmSiloPanel me={me} onClose={() => setPanel(null)} /> : null}
          {panel === 'farm-shop' ? <FarmShopPanel me={me} onClose={() => setPanel(null)} /> : null}
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
    id: Panel | 'town' | 'admin';
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    current: boolean;
  }[] = [
    {
      id: 'town',
      label: 'Thị trấn',
      icon: <MapIcon size={17} />,
      onClick: () => {
        setPanel(null);
        if (room.kind !== 'town') void net.goTown();
      },
      current: !panel && room.kind === 'town',
    },
    {
      id: 'backpack',
      label: 'Balo (B)',
      icon: <Package size={17} />,
      onClick: () => setPanel(panel === 'backpack' ? null : 'backpack'),
      current: panel === 'backpack' || panel === 'tackle' || panel === 'wardrobe',
    },
    {
      id: 'events',
      label: 'Bảng tin sự kiện',
      icon: <CalendarDays size={17} />,
      onClick: () => setPanel('events'),
      current: panel === 'events',
    },
    ...(me.role === 'admin'
      ? [
          {
            id: 'admin' as const,
            label: 'Quản trị',
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
      <nav className="nav" aria-label="Menu chính">
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
          title="Xu — chi tiêu tại cửa hàng, đổi lấy Tín dụng AI"
        >
          <span className="balance-icon">
            <CoinIcon />
          </span>
          <span>
            <div className="balance-value">{num(me.balances.coin)}</div>
            <div className="balance-label">Xu</div>
          </span>
        </button>
        <button
          className="balance balance-fame"
          onClick={() => setPanel('ledger')}
          title="Danh tiếng — kiếm từ hoạt động và sự kiện"
        >
          <span className="balance-icon">
            <Star size={14} />
          </span>
          <span>
            <div className="balance-value">{num(me.balances.fame)}</div>
            <div className="balance-label">Danh tiếng</div>
          </span>
        </button>
        <button
          className="balance balance-ai"
          onClick={() => setPanel('ai')}
          title="Tín dụng AI — cấp hạn mức cho khóa API"
        >
          <span className="balance-icon">
            <Sparkles size={14} />
          </span>
          <span>
            <div className="balance-value">{usd(me.balances.aiCreditCents)}</div>
            <div className="balance-label">Tín dụng AI</div>
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
                setPanel('backpack');
              }}
            >
              <Package size={16} /> Balo cá nhân (Tủ đồ & Hồ sơ)
            </button>
            <button
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setMenu(false);
                setPanel('fishdex');
              }}
            >
              <BookOpen size={16} /> Từ điển cá (55 loài)
            </button>
            <button
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setMenu(false);
                setPanel('ledger');
              }}
            >
              <Receipt size={16} /> Lịch sử giao dịch
            </button>
            <button role="menuitem" className="menu-item" onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} Âm thanh: {muted ? 'Tắt' : 'Bật'}
            </button>
            {me.role === 'admin' ? (
              <button role="menuitem" className="menu-item" onClick={() => navigate('/admin')}>
                <Shield size={16} /> Bảng điều khiển quản trị
              </button>
            ) : null}
            <div className="menu-sep" />
            <button role="menuitem" className="menu-item" onClick={() => void signOut()}>
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

const ZONE_ACTIONS: Partial<Record<ZoneId, { cta: string; hint: string }>> = {
  pier: { cta: 'Thả cần câu', hint: 'Câu cá kiếm Xu và Danh tiếng' },
  fishing_shop: { cta: 'Mua cần câu & Ngư cụ', hint: 'Sắm cần câu xịn, tăng cơ hội săn cá khổng lồ' },
  delivery: { cta: 'Nhận đơn hàng', hint: 'Giao kiện hàng quanh thị trấn' },
  cafe: { cta: 'Bắt đầu ca làm', hint: 'Pha chế đồ uống cho khách hàng kỳ lạ' },
  fashion: { cta: 'Xem trang phục', hint: 'Mũ nón, áo quần và phụ kiện cá tính' },
  furniture: { cta: 'Xem nội thất', hint: 'Vật phẩm trang trí căn hộ của bạn' },
  apartments: { cta: 'Về nhà', hint: 'Bước vào căn hộ của bạn' },
  events: { cta: 'Mở bảng sự kiện', hint: 'Tham gia sự kiện tiếp theo' },
  ai_kiosk: { cta: 'Mở Trạm thưởng AI', hint: 'Đổi Xu lấy hạn mức API AI' },
  vietprodev: { cta: 'Vào công ty', hint: 'Công ty công nghệ VietProDev' },
  dntu: { cta: 'Vào trường ĐH', hint: 'Trường Đại học Công nghệ Đồng Nai' },
  comga: { cta: 'Ăn cơm gà', hint: 'Quán Cơm Gà Xối Mỡ 68 Biên Hòa' },
  bida: { cta: 'Vào quán Bida', hint: 'CLB Bida H2S Trảng Dài Biên Hòa (Giao lưu 1v1)' },
  cybernet: { cta: 'Vào Cyber Game', hint: 'Cyber Game HNT Trảng Dài' },
  farm_gate: { cta: 'Vào Trang Trại', hint: 'Trang trại nông thôn Nam Bộ' },
};

function WorldHud({ me }: { me: Me }) {
  const zone = useUi((s) => s.zone);
  const room = useUi((s) => s.room);
  const panel = useUi((s) => s.panel);
  const activity = useUi((s) => s.activity);
  const delivery = useUi((s) => s.delivery);
  const zoom = useUi((s) => s.zoom);
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
      case 'fishing_shop':
        return setPanel('shop-rods');
      case 'cafe':
        return setActivity('cafe');
      case 'delivery':
        return void startDelivery();
      case 'fashion':
        return setPanel('shop-fashion');
      case 'furniture':
        return setPanel('shop-furniture');
      case 'apartments':
        return void net.goApartment(me.id, 'Căn hộ của bạn');
      case 'events':
        return setPanel('events');
      case 'ai_kiosk':
        return setPanel('ai');
      case 'vietprodev':
        return void net.goCompany('Văn Phòng VietProDev');
      case 'dntu':
        return void net.goUniversity('Đại Học Công Nghệ Đồng Nai (DNTU)');
      case 'comga':
        return void net.goComGa('Cơm Gà Xối Mỡ 68 Biên Hòa');
      case 'bida':
        return void net.goBida('CLB Bida H2S Trảng Dài (Biên Hòa)');
      case 'cybernet':
        return void net.goCyberNet();
      case 'farm_gate':
        return void net.goFarm(me.id, 'Trang Trại Cá Nhân');
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (panel || activity || document.querySelector('.backdrop')) return;
      if ((e.key === 'e' || e.key === 'E') && action && !delivery) runAction();
      if (e.key === 'q' || e.key === 'Q') setEmotes((v) => !v);
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        useUi.getState().setZoom((z) => z + 0.15);
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        useUi.getState().setZoom((z) => z - 0.15);
      }
      if (e.key === '0') {
        e.preventDefault();
        useUi.getState().setZoom(1.0);
      }
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
            <Compass size={14} style={{ color: 'var(--primary)', flex: 'none' }} />
            <span>{room.kind === 'town' ? (zoneLabel ?? 'Thị trấn') : room.label}</span>
          </div>
          {room.kind === 'apartment' ||
          room.kind === 'company' ||
          room.kind === 'university' ||
          room.kind === 'comga' ||
          room.kind === 'bida' ||
          room.kind === 'cybernet' ? (
            <Button size="sm" onClick={() => void net.goTown()}>
              <MapIcon size={15} /> Về thị trấn
            </Button>
          ) : null}
          {room.kind === 'bida' ? (
            <Button size="sm" variant="reward" onClick={() => setPanel('bida')}>
              🎱 Bida Arena (Tạo phòng & Ghép đấu)
            </Button>
          ) : null}
        </div>
        {ev ? (
          <div className="event-chip">
            <span>
              {ev.status === 'running' ? '🦆 ' : ''}
              {ev.title} {ev.status === 'running' ? 'kết thúc sau' : 'bắt đầu sau'} <strong>{mmss}</strong>
            </span>
            <Button size="sm" variant={ev.joined ? 'secondary' : 'reward'} onClick={() => setPanel('events')}>
              {ev.joined ? (ev.status === 'running' ? `Điểm ${ev.myScore}` : 'Đã tham gia') : 'Tham gia'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hud-bottom">
        {delivery ? <DeliveryHud /> : null}
        {action && !activity && !panel && !(delivery && !deliveringHere) ? (
          <div className="prompt" role="status">
            <div className="prompt-icon">
              <Sparkles size={18} />
            </div>
            <div className="prompt-text">
              <strong>{zoneLabel}</strong>
              <span>{action.hint}</span>
            </div>
            <Button variant="primary" onClick={runAction}>
              <span className="kbd">E</span>
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
            aria-label="Cảm xúc (Q)"
            title="Biểu cảm (Q)"
            onClick={() => setEmotes((v) => !v)}
          >
            <Smile size={20} />
          </button>
          {emotes ? (
            <div className="emote-wheel" role="menu" aria-label="Biểu cảm">
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
          aria-label="Balo cá nhân (B)"
          title="Balo cá nhân (B)"
          onClick={() => setPanel(panel === 'backpack' ? null : 'backpack')}
        >
          <Package size={20} />
        </button>
      </div>

      <div className="zoom-card" role="group" aria-label="Tầm nhìn bản đồ">
        <button
          className="zoom-btn"
          title="Phóng to bản đồ (+ hoặc cuộn chuột lên)"
          aria-label="Phóng to bản đồ"
          onClick={() => useUi.getState().setZoom((z) => z + 0.15)}
        >
          <ZoomIn size={15} />
        </button>
        <button
          className="zoom-level"
          title="Nhấp để đặt lại 100% (Phím 0)"
          aria-label={`Mức phóng to ${Math.round(zoom * 100)}%, nhấp để đặt lại 100%`}
          onClick={() => useUi.getState().setZoom(1.0)}
        >
          <span>{Math.round(zoom * 100)}%</span>
        </button>
        <button
          className="zoom-btn"
          title="Thu nhỏ bản đồ (- hoặc cuộn chuột xuống)"
          aria-label="Thu nhỏ bản đồ"
          onClick={() => useUi.getState().setZoom((z) => z - 0.15)}
        >
          <ZoomOut size={15} />
        </button>
      </div>

      <div className="help-card" aria-hidden>
        <div className="help-group">
          <span className="kbd">W</span>
          <span className="kbd">A</span>
          <span className="kbd">S</span>
          <span className="kbd">D</span>
          <span>di chuyển</span>
        </div>
        <div className="help-sep" />
        <div className="help-group">
          <span className="kbd">E</span>
          <span>tương tác</span>
        </div>
        <div className="help-sep" />
        <div className="help-group">
          <span className="kbd">B</span>
          <span>balo</span>
        </div>
        <div className="help-sep" />
        <div className="help-group">
          <span className="kbd">Enter</span>
          <span>trò chuyện</span>
        </div>
        <div className="help-sep" />
        <div className="help-group">
          <span className="kbd">Cuộn</span>
          <span>zoom map</span>
        </div>
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
            ? 'Đang vào thị trấn…'
            : offline
              ? 'Bạn đã bị ngắt kết nối'
              : 'Đang kết nối lại…'}
        </h3>
        <p className="muted">
          {connection === 'connecting'
            ? 'Đang tải khu phố…'
            : offline
              ? 'Phiên đăng nhập đã đóng. Có thể bạn đã mở game ở một thiết bị hoặc tab khác.'
              : 'Mất kết nối tới máy chủ thị trấn. Dữ liệu của bạn được lưu an toàn trên máy chủ.'}
        </p>
        {connection !== 'connecting' ? (
          <Button variant="primary" onClick={() => net.retryNow()}>
            Kết nối lại ngay
          </Button>
        ) : null}
      </div>
    </div>
  );
}

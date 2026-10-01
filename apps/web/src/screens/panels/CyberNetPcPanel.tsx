import {
  Cpu,
  Crosshair,
  Folder,
  Globe,
  HardDrive,
  Minus,
  Music,
  Pause,
  Play,
  Power,
  RotateCcw,
  Search,
  Shield,
  ShoppingBag,
  Square,
  Sword,
  Trash2,
  Utensils,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';

type WindowApp = 'thispc' | 'lol' | 'valorant' | 'food' | 'specs' | 'browser' | 'music' | 'recycle';

interface WindowState {
  app: WindowApp;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  minimized: boolean;
  zIndex: number;
}

interface CyberNetPcPanelProps {
  me: Me;
  onClose: () => void;
}

interface OrderItem {
  id: string;
  name: string;
  category: 'food' | 'drink' | 'combo';
  price: number;
  desc: string;
  badge?: string;
}

const MENU_ITEMS: OrderItem[] = [
  {
    id: 'f1',
    name: 'Mì Tôm Xào Bò 2 Trứng Ốp La',
    category: 'food',
    price: 35000,
    desc: 'Mì Indomie sốt đặc biệt, thịt bò mềm, 2 trứng ốp lòng đào béo ngậy.',
    badge: 'Best Seller',
  },
  {
    id: 'f2',
    name: 'Cơm Chiên Dưa Bò Giòn Rụm',
    category: 'food',
    price: 45000,
    desc: 'Cơm rang hạt tơi giòn vàng, dưa chua xào bò thấm vị đậm đà.',
    badge: 'Đặc Sản Net',
  },
  {
    id: 'f3',
    name: 'Mì Cay Xúc Xích Phô Mai Kéo Sợi',
    category: 'food',
    price: 40000,
    desc: 'Mì Hàn Quốc cấp độ 2, xúc xích nướng kèm phô mai mozzarella chảy tràn.',
  },
  {
    id: 'f4',
    name: 'Bánh Mì Thịt Nguội Pate Cột Đèn',
    category: 'food',
    price: 25000,
    desc: 'Bánh mì nóng giòn rụm, pate béo ngậy đặc sản kèm dưa góp.',
  },
  {
    id: 'd1',
    name: 'Chai Sting Dâu Ướp Lạnh',
    category: 'drink',
    price: 15000,
    desc: 'Sting đỏ ướp lạnh buốt cổ, tiếp sức combat thâu đêm.',
    badge: 'Huyền Thoại Net',
  },
  {
    id: 'd2',
    name: 'Lon Bò Húc Thái (Red Bull)',
    category: 'drink',
    price: 20000,
    desc: 'Bò húc Thái nắp vàng ngọt đậm, tỉnh táo 100% leo rank.',
  },
  {
    id: 'd3',
    name: 'Lon Monster Energy Ultra White',
    category: 'drink',
    price: 35000,
    desc: 'Nước tăng lực thể thao điện tử không đường, mát lạnh sảng khoái.',
  },
  {
    id: 'd4',
    name: 'Cà Phê Sữa Đá Biên Hòa',
    category: 'drink',
    price: 20000,
    desc: 'Cà phê rang xay đậm đà phối sữa đặc béo ngậy pha phin truyền thống.',
  },
  {
    id: 'c1',
    name: 'Combo Cày Đêm VIP (Mì Bò + Sting + Khăn Lạnh)',
    category: 'combo',
    price: 48000,
    desc: '1 Mì xào bò trứng + 1 Sting dâu lạnh + 1 khăn lạnh thơm mát.',
    badge: 'Tiết Kiệm 15%',
  },
  {
    id: 'c2',
    name: 'Combo Thần Rừng (Cơm Rang + Monster)',
    category: 'combo',
    price: 75000,
    desc: '1 Cơm rang dưa bò giòn + 1 lon Monster trắng mát lạnh.',
  },
];

export function CyberNetPcPanel({ me, onClose }: CyberNetPcPanelProps) {
  const cyberStation = useUi((s) => s.cyberStation) ?? 'VIP 01';

  // Windows Desktop OS State: Starts on desktop with NO windows open, so user sees Windows!
  const [windows, setWindows] = useState<Record<WindowApp, WindowState>>({
    thispc: {
      app: 'thispc',
      x: 80,
      y: 40,
      width: 620,
      height: 400,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
    lol: {
      app: 'lol',
      x: 100,
      y: 30,
      width: 750,
      height: 500,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
    valorant: {
      app: 'valorant',
      x: 120,
      y: 30,
      width: 750,
      height: 500,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
    food: {
      app: 'food',
      x: 90,
      y: 40,
      width: 680,
      height: 460,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
    specs: {
      app: 'specs',
      x: 110,
      y: 50,
      width: 620,
      height: 420,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
    browser: {
      app: 'browser',
      x: 70,
      y: 40,
      width: 700,
      height: 460,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
    music: {
      app: 'music',
      x: 150,
      y: 60,
      width: 520,
      height: 380,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
    recycle: {
      app: 'recycle',
      x: 140,
      y: 70,
      width: 480,
      height: 320,
      maximized: false,
      minimized: false,
      zIndex: 1,
    },
  });

  const [openApps, setOpenApps] = useState<Set<WindowApp>>(new Set());
  const [activeApp, setActiveApp] = useState<WindowApp | null>(null);
  const [topZ, setTopZ] = useState(10);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(3 * 3600 + 45 * 60 + 20);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orders, setOrders] = useState<{ id: string; name: string; time: string; status: string }[]>([]);
  const [orderCart, setOrderCart] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState('');
  const [csmMinimized, setCsmMinimized] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('vi-VN'));
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('vi-VN'));

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN'));
      setCurrentDate(now.toLocaleDateString('vi-VN'));
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Open App in Window
  const openApp = useCallback(
    (app: WindowApp) => {
      play('pop');
      const nextZ = topZ + 1;
      setTopZ(nextZ);
      setWindows((prev) => {
        const cur = prev[app];
        return {
          ...prev,
          [app]: {
            ...cur,
            minimized: false,
            zIndex: nextZ,
          },
        };
      });
      setOpenApps((prev) => new Set([...prev, app]));
      setActiveApp(app);
      setStartMenuOpen(false);
    },
    [topZ],
  );

  // Focus Window
  const focusWindow = useCallback(
    (app: WindowApp) => {
      const nextZ = topZ + 1;
      setTopZ(nextZ);
      setWindows((prev) => {
        const cur = prev[app];
        return {
          ...prev,
          [app]: { ...cur, zIndex: nextZ },
        };
      });
      setActiveApp(app);
    },
    [topZ],
  );

  // Minimize Window
  const minimizeWindow = useCallback(
    (app: WindowApp) => {
      play('click');
      setWindows((prev) => {
        const cur = prev[app];
        return {
          ...prev,
          [app]: { ...cur, minimized: true },
        };
      });
      if (activeApp === app) {
        const remaining = Array.from(openApps).filter((a) => a !== app && !windows[a].minimized);
        setActiveApp(remaining.length > 0 ? (remaining[remaining.length - 1] ?? null) : null);
      }
    },
    [activeApp, openApps, windows],
  );

  // Toggle Maximize Window
  const toggleMaximize = useCallback((app: WindowApp) => {
    play('click');
    setWindows((prev) => {
      const cur = prev[app];
      return {
        ...prev,
        [app]: { ...cur, maximized: !cur.maximized },
      };
    });
  }, []);

  // Close Window
  const closeWindow = useCallback(
    (app: WindowApp) => {
      play('click');
      setOpenApps((prev) => {
        const next = new Set(prev);
        next.delete(app);
        return next;
      });
      if (activeApp === app) {
        const remaining = Array.from(openApps).filter((a) => a !== app);
        setActiveApp(remaining.length > 0 ? (remaining[remaining.length - 1] ?? null) : null);
      }
    },
    [activeApp, openApps],
  );

  // Esc hotkey
  const handleEscKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeApp) {
          closeWindow(activeApp);
        } else {
          onClose();
        }
      }
    },
    [activeApp, onClose, closeWindow],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [handleEscKey]);

  // Order submission
  const handlePlaceOrder = () => {
    const items = Object.entries(orderCart).filter(([_, qty]) => qty > 0);
    if (items.length === 0) {
      useUi.getState().toast({
        kind: 'error',
        title: 'Chưa chọn món',
        body: 'Vui lòng chọn ít nhất một món ăn hoặc thức uống để gọi phục vụ!',
      });
      play('error');
      return;
    }

    const total = items.reduce((sum, [id, qty]) => {
      const item = MENU_ITEMS.find((m) => m.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);

    play('cyber_order');
    const orderTitle = items
      .map(([id, qty]) => {
        const item = MENU_ITEMS.find((m) => m.id === id);
        return `${qty}x ${item?.name}`;
      })
      .join(', ');

    const newOrder = {
      id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
      name: orderTitle,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'Đang chế biến 🍳',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setOrderCart({});
    setOrderNote('');

    useUi.getState().toast({
      kind: 'reward',
      title: '🍜 Đã Gọi Món Thành Công!',
      body: `Bếp Cyber HNT đã nhận đơn (${total.toLocaleString('vi-VN')} đ). Bảo Staff sẽ mang tới máy ${cyberStation} sau 3 phút!`,
    });
  };

  return (
    <div
      className="backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Màn Hình Máy Tính Windows 11 Cyber HNT"
    >
      {/* Outer Monitor Frame (ASUS ROG 280Hz Fast IPS) */}
      <div
        style={{
          width: '98vw',
          maxWidth: 1100,
          height: '94vh',
          maxHeight: 740,
          background: '#020617',
          borderRadius: 14,
          boxShadow: '0 0 60px rgba(56, 189, 248, 0.3), 0 30px 80px rgba(0, 0, 0, 0.95)',
          border: '4px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* Monitor Top Bezel (Brand & Network) */}
        <div
          style={{
            height: 20,
            background: '#090d16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid #1e293b',
            fontSize: 10,
            color: '#64748b',
          }}
        >
          <div className="row" style={{ gap: 8 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            <span style={{ fontWeight: 800, letterSpacing: '0.08em', color: '#cbd5e1' }}>
              ASUS ROG SWIFT 280Hz · FAST IPS · CYBER GAME HNT TRẢNG DÀI
            </span>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>FPT FIBER 1Gbps · PING: 4ms</span>
            <button
              onClick={onClose}
              title="Rời máy tính về nhân vật (Esc)"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <Power size={13} /> Rời máy (Esc)
            </button>
          </div>
        </div>

        {/* Windows Desktop Surface */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            // Iconic Windows 11 Dark Bloom Wallpaper
            background: 'radial-gradient(circle at 50% 40%, #1e1b4b 0%, #0f172a 45%, #020617 100%)',
            overflow: 'hidden',
          }}
        >
          {/* Windows 11 Bloom Ambient Curves Graphics */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `
                radial-gradient(circle at 65% 55%, rgba(168, 85, 247, 0.18) 0%, transparent 45%),
                radial-gradient(circle at 35% 45%, rgba(56, 189, 248, 0.22) 0%, transparent 50%),
                radial-gradient(circle at 50% 60%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)
              `,
            }}
          />

          {/* Desktop Wallpaper Cyber Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              right: 40,
              textAlign: 'right',
              pointerEvents: 'none',
              opacity: 0.35,
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 900, color: '#38bdf8', letterSpacing: 2 }}>
              CYBER GAME HNT
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f472b6', letterSpacing: 4 }}>
              WINDOWS 11 PRO ESPORTS EDITION · MÁY {cyberStation}
            </div>
          </div>

          {/* Desktop Shortcuts Grid (Top-Left) */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              zIndex: 5,
            }}
          >
            <WindowsDesktopIcon
              icon={<HardDrive size={30} color="#38bdf8" />}
              label="This PC"
              onClick={() => openApp('thispc')}
            />
            <WindowsDesktopIcon
              icon={<Sword size={30} color="#60a5fa" />}
              label="Liên Minh LMHT"
              badge="Hot"
              onClick={() => openApp('lol')}
            />
            <WindowsDesktopIcon
              icon={<Crosshair size={30} color="#f43f5e" />}
              label="Valoran FPS"
              badge="WASD"
              onClick={() => openApp('valorant')}
            />
            <WindowsDesktopIcon
              icon={<Utensils size={30} color="#fbbf24" />}
              label="Gọi Món Bếp Net"
              onClick={() => openApp('food')}
            />
            <WindowsDesktopIcon
              icon={<Globe size={30} color="#34d399" />}
              label="Google Chrome"
              onClick={() => openApp('browser')}
            />
            <WindowsDesktopIcon
              icon={<Cpu size={30} color="#a855f7" />}
              label="Cấu Hình Máy"
              onClick={() => openApp('specs')}
            />
            <WindowsDesktopIcon
              icon={<Music size={30} color="#ec4899" />}
              label="Zing MP3"
              onClick={() => openApp('music')}
            />
            <WindowsDesktopIcon
              icon={<Trash2 size={28} color="#94a3b8" />}
              label="Recycle Bin"
              onClick={() => openApp('recycle')}
            />
          </div>

          {/* CSM / GCafe Billing Bar (Top-Right Floating Widget) */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 14,
              width: csmMinimized ? 160 : 250,
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
              padding: '8px 12px',
              zIndex: 50,
              color: '#f8fafc',
              transition: 'all 0.2s ease',
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <div className="row" style={{ gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#38bdf8' }}>CSM CYBER HNT</span>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    background: '#0284c7',
                    color: '#fff',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  {cyberStation}
                </span>
                <button
                  onClick={() => setCsmMinimized(!csmMinimized)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 2,
                  }}
                >
                  {csmMinimized ? <Square size={10} /> : <Minus size={10} />}
                </button>
              </div>
            </div>

            {!csmMinimized && (
              <>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                  Hội viên: <strong style={{ color: '#facc15' }}>{me.displayName}</strong>
                </div>
                <div
                  className="row"
                  style={{
                    justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '6px 8px',
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>THỜI GIAN CÒN LẠI</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                      {formatCountdown(timeRemaining)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#64748b' }}>TÀI KHOẢN COIN</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>
                      {me.balances.coin.toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ fontSize: 10, padding: '3px 6px', flex: 1 }}
                    onClick={() => {
                      play('coin');
                      setTimeRemaining((prev) => prev + 3600);
                      useUi.getState().toast({
                        kind: 'reward',
                        title: '⚡ Đã Nạp Thêm 1 Giờ Chơi',
                        body: 'Đã cộng thêm 01:00:00 vào tài khoản máy ' + cyberStation + '!',
                      });
                    }}
                  >
                    +1h Chơi
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ fontSize: 10, padding: '3px 6px', flex: 1 }}
                    onClick={() => {
                      play('duck');
                      useUi.getState().toast({
                        kind: 'info',
                        title: '🔔 Đã Báo Nhân Viên',
                        body: 'Bảo Staff đã nhận được chuông gọi tại quầy phục vụ!',
                      });
                    }}
                  >
                    Gọi Phục Vụ
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Floating Movable Windows Area */}
          {Array.from(openApps).map((app) => {
            const w = windows[app];
            if (w.minimized) return null;
            const isActive = activeApp === app;

            return (
              <DraggableWindow
                key={app}
                title={
                  app === 'thispc'
                    ? '💻 This PC (Máy Tính Này) - Quản Lý Ổ Đĩa'
                    : app === 'lol'
                      ? "⚔️ Liên Minh Huyền Thoại - Chiến Trường Summoner's Rift"
                      : app === 'valorant'
                        ? '🎯 Valoran Tactical FPS - Chế Độ Di Chuyển WASD & Đấu Súng'
                        : app === 'food'
                          ? '🍜 Quán Ăn Cyber HNT - Gọi Món Trực Tuyến Tận Máy'
                          : app === 'specs'
                            ? '⚙️ Cấu Hình Phần Cứng - Máy Trạm VIP Esports'
                            : app === 'browser'
                              ? '🌐 Google Chrome - Tin Tức & Cẩm Nang Esports'
                              : app === 'music'
                                ? '🎵 Zing MP3 - Nhạc Gaming Lofi & Chill'
                                : '🗑️ Recycle Bin (Thùng Rác Hệ Thống)'
                }
                x={w.x}
                y={w.y}
                width={w.width}
                height={w.height}
                maximized={w.maximized}
                zIndex={w.zIndex}
                active={isActive}
                onFocus={() => focusWindow(app)}
                onMinimize={() => minimizeWindow(app)}
                onToggleMaximize={() => toggleMaximize(app)}
                onClose={() => closeWindow(app)}
                onMove={(nx, ny) => {
                  setWindows((prev) => ({
                    ...prev,
                    [app]: { ...prev[app], x: nx, y: ny },
                  }));
                }}
              >
                {app === 'thispc' && <ThisPcWindow onOpenApp={openApp} />}
                {app === 'lol' && <LolGameWindow soundEnabled={soundEnabled} />}
                {app === 'valorant' && <ValorantGameWindow soundEnabled={soundEnabled} />}
                {app === 'food' && (
                  <FoodOrderWindow
                    cart={orderCart}
                    setCart={setOrderCart}
                    note={orderNote}
                    setNote={setOrderNote}
                    orders={orders}
                    onPlaceOrder={handlePlaceOrder}
                  />
                )}
                {app === 'specs' && <SpecsWindow station={cyberStation} />}
                {app === 'browser' && <BrowserWindow />}
                {app === 'music' && <MusicWindow soundEnabled={soundEnabled} />}
                {app === 'recycle' && <RecycleBinWindow />}
              </DraggableWindow>
            );
          })}
        </div>

        {/* Windows 11 Start Menu Popup */}
        {startMenuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 48,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 500,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 12,
              boxShadow: '0 -15px 40px rgba(0,0,0,0.8)',
              padding: 20,
              zIndex: 100,
              color: '#f8fafc',
            }}
          >
            {/* Search Bar */}
            <div
              className="row"
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                borderRadius: 20,
                padding: '8px 14px',
                gap: 8,
                marginBottom: 16,
                border: '1px solid #334155',
              }}
            >
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Nhập để tìm kiếm ứng dụng, trò chơi, file..."
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>
              ỨNG DỤNG ĐÃ GHIM (PINNED)
            </div>

            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}
            >
              <StartMenuItem
                icon={<Sword size={24} color="#60a5fa" />}
                label="Liên Minh"
                onClick={() => openApp('lol')}
              />
              <StartMenuItem
                icon={<Crosshair size={24} color="#f43f5e" />}
                label="Valoran"
                onClick={() => openApp('valorant')}
              />
              <StartMenuItem
                icon={<Utensils size={24} color="#fbbf24" />}
                label="Gọi Món"
                onClick={() => openApp('food')}
              />
              <StartMenuItem
                icon={<Globe size={24} color="#34d399" />}
                label="Chrome"
                onClick={() => openApp('browser')}
              />
              <StartMenuItem
                icon={<Cpu size={24} color="#a855f7" />}
                label="Cấu Hình"
                onClick={() => openApp('specs')}
              />
              <StartMenuItem
                icon={<Music size={24} color="#ec4899" />}
                label="Zing MP3"
                onClick={() => openApp('music')}
              />
              <StartMenuItem
                icon={<HardDrive size={24} color="#38bdf8" />}
                label="This PC"
                onClick={() => openApp('thispc')}
              />
              <StartMenuItem
                icon={<Trash2 size={24} color="#94a3b8" />}
                label="Thùng Rác"
                onClick={() => openApp('recycle')}
              />
            </div>

            {/* User Footer & Power */}
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                borderTop: '1px solid #1e293b',
                paddingTop: 12,
              }}
            >
              <div className="row" style={{ gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  {me.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#facc15' }}>{me.displayName}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Máy: {cyberStation} · VIP Member</div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  play('click');
                  onClose();
                }}
                style={{ color: '#ef4444', gap: 6 }}
              >
                <Power size={14} /> Tắt Máy (Esc)
              </Button>
            </div>
          </div>
        )}

        {/* Windows 11 Centered Taskbar */}
        <div
          style={{
            height: 44,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            zIndex: 60,
          }}
        >
          <div style={{ width: 100 }} />

          {/* Center Windows 11 App Icons */}
          <div className="row" style={{ gap: 6 }}>
            {/* Windows 11 Start Icon (4 blue squares) */}
            <button
              onClick={() => {
                play('click');
                setStartMenuOpen((prev) => !prev);
              }}
              title="Start Menu"
              style={{
                background: startMenuOpen ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 6px)', gap: 2 }}>
                <span style={{ width: 6, height: 6, background: '#38bdf8', borderRadius: 1 }} />
                <span style={{ width: 6, height: 6, background: '#38bdf8', borderRadius: 1 }} />
                <span style={{ width: 6, height: 6, background: '#38bdf8', borderRadius: 1 }} />
                <span style={{ width: 6, height: 6, background: '#38bdf8', borderRadius: 1 }} />
              </div>
            </button>

            {/* Taskbar Opened Apps */}
            {Array.from(openApps).map((app) => {
              const isActive = activeApp === app && !windows[app].minimized;
              return (
                <button
                  key={app}
                  onClick={() => {
                    play('pop');
                    if (windows[app].minimized) {
                      setWindows((prev) => ({
                        ...prev,
                        [app]: { ...prev[app], minimized: false },
                      }));
                      focusWindow(app);
                    } else if (isActive) {
                      minimizeWindow(app);
                    } else {
                      focusWindow(app);
                    }
                  }}
                  style={{
                    background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    position: 'relative',
                  }}
                >
                  {app === 'thispc' && <HardDrive size={18} color="#38bdf8" />}
                  {app === 'lol' && <Sword size={18} color="#60a5fa" />}
                  {app === 'valorant' && <Crosshair size={18} color="#f43f5e" />}
                  {app === 'food' && <Utensils size={18} color="#fbbf24" />}
                  {app === 'specs' && <Cpu size={18} color="#a855f7" />}
                  {app === 'browser' && <Globe size={18} color="#34d399" />}
                  {app === 'music' && <Music size={18} color="#ec4899" />}
                  {app === 'recycle' && <Trash2 size={18} color="#94a3b8" />}
                  {/* Active bottom pill */}
                  <span
                    style={{
                      width: isActive ? 16 : 6,
                      height: 3,
                      borderRadius: 2,
                      background: isActive ? '#38bdf8' : '#64748b',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* System Tray (Right) */}
          <div className="row" style={{ gap: 12, color: '#94a3b8', fontSize: 11 }}>
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: soundEnabled ? '#38bdf8' : '#64748b',
                cursor: 'pointer',
              }}
              title="Bật/Tắt âm thanh máy tính"
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <div className="row" style={{ gap: 4 }} title="Mạng FPT LAN 1.0 Gbps · Ping 4ms">
              <Wifi size={14} color="#10b981" />
              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 800 }}>4ms</span>
            </div>
            <div
              style={{
                background: '#1e293b',
                padding: '1px 5px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 800,
                color: '#38bdf8',
                border: '1px solid #334155',
              }}
              title="Bộ gõ tiếng Việt UniKey"
            >
              VIE
            </div>
            <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: 11 }}>{currentTime}</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>{currentDate}</div>
            </div>
            {/* Show Desktop Button */}
            <div
              onClick={() => {
                play('click');
                setWindows((prev) => {
                  const copy = { ...prev };
                  (Object.keys(copy) as WindowApp[]).forEach((k) => {
                    copy[k].minimized = true;
                  });
                  return copy;
                });
                setActiveApp(null);
              }}
              title="Hiện màn hình Desktop (Show Desktop)"
              style={{
                width: 4,
                height: 24,
                borderLeft: '1px solid #334155',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components: Desktop Icon & Draggable Floating Window
// -------------------------------------------------------------

function WindowsDesktopIcon({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 74,
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 6,
        padding: '6px 4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 4,
            background: '#ef4444',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            padding: '0 4px',
            borderRadius: 6,
          }}
        >
          {badge}
        </span>
      )}
      <div
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#ffffff',
          textShadow: '0 1px 3px rgba(0,0,0,0.95)',
          textAlign: 'center',
          lineHeight: 1.2,
          wordBreak: 'break-word',
        }}
      >
        {label}
      </span>
    </button>
  );
}

function StartMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        color: '#f8fafc',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DraggableWindow({
  title,
  x,
  y,
  width,
  height,
  maximized,
  zIndex,
  active,
  children,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onClose,
  onMove,
}: {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  zIndex: number;
  active: boolean;
  children: React.ReactNode;
  onFocus: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onMove: (nx: number, ny: number) => void;
}) {
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    onFocus();
    if (maximized) return;
    isDragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: x,
      startY: y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = moveEvent.clientX - dragStart.current.mouseX;
      const dy = moveEvent.clientY - dragStart.current.mouseY;
      onMove(Math.max(10, dragStart.current.startX + dx), Math.max(10, dragStart.current.startY + dy));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onClick={onFocus}
      style={{
        position: 'absolute',
        left: maximized ? 0 : x,
        top: maximized ? 0 : y,
        width: maximized ? '100%' : width,
        height: maximized ? '100%' : height,
        maxWidth: maximized ? '100%' : 'calc(100% - 20px)',
        maxHeight: maximized ? '100%' : 'calc(100% - 20px)',
        background: '#090d16',
        borderRadius: maximized ? 0 : 10,
        border: active ? '1px solid #38bdf8' : '1px solid #1e293b',
        boxShadow: active
          ? '0 16px 40px rgba(0,0,0,0.85), 0 0 20px rgba(56, 189, 248, 0.25)'
          : '0 8px 24px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex,
      }}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: 34,
          background: active ? '#0f172a' : '#090d16',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          cursor: maximized ? 'default' : 'move',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#38bdf8' : '#94a3b8' }}>{title}</span>
        <div className="row" style={{ gap: 4 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title="Thu nhỏ xuống taskbar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Minus size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            title="Phóng to / Thu nhỏ cửa sổ"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Square size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Đóng cửa sổ"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

// -------------------------------------------------------------
// APP: THIS PC (MÁY TÍNH NÀY)
// -------------------------------------------------------------

function ThisPcWindow({ onOpenApp }: { onOpenApp: (app: WindowApp) => void }) {
  return (
    <div style={{ padding: 18, height: '100%', overflowY: 'auto', background: '#090d16', color: '#f8fafc' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#38bdf8' }}>
        Thiết Bị & Ổ Đĩa (Devices & Drives)
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #1e293b' }}>
          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
            <HardDrive size={32} color="#38bdf8" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Local Disk (C:) - Hệ Điều Hành</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>142 GB trống trên 512 GB (NVMe Gen4)</div>
            </div>
          </div>
          <div
            style={{ width: '100%', height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}
          >
            <div style={{ width: '72%', height: '100%', background: '#0284c7' }} />
          </div>
        </div>

        <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #1e293b' }}>
          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
            <HardDrive size={32} color="#34d399" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Data & Games (D:) - Cyber HNT</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>890 GB trống trên 2000 GB SSD</div>
            </div>
          </div>
          <div
            style={{ width: '100%', height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}
          >
            <div style={{ width: '55%', height: '100%', background: '#10b981' }} />
          </div>
        </div>
      </div>

      <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#facc15' }}>Thư Mục Trò Chơi Đã Cài Đặt Sẵn:</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <button
          onClick={() => onOpenApp('lol')}
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid #1e293b',
            borderRadius: 6,
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <Folder size={20} color="#60a5fa" />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Riot Games / LMHT</span>
        </button>
        <button
          onClick={() => onOpenApp('valorant')}
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid #1e293b',
            borderRadius: 6,
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <Folder size={20} color="#f43f5e" />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Valorant Esports</span>
        </button>
        <button
          onClick={() => onOpenApp('specs')}
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid #1e293b',
            borderRadius: 6,
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <Folder size={20} color="#a855f7" />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Thông Tin Phần Cứng</span>
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// GAME 1: "LIÊN MINH HUYỀN THOẠI" (Playable Real Canvas MOBA)
// -------------------------------------------------------------

function LolGameWindow({ soundEnabled }: { soundEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stats, setStats] = useState({
    level: 1,
    gold: 500,
    cs: 0,
    kills: 0,
    deaths: 0,
    qStacks: 0,
    cooldowns: { q: 0, w: 0, e: 0, r: 0, d: 0 },
  });

  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [victory, setVictory] = useState(false);

  const gameRef = useRef({
    player: {
      x: 140,
      y: 220,
      targetX: 140,
      targetY: 220,
      hp: 580,
      maxHp: 580,
      speed: 3.2,
      windwallActive: 0,
    },
    enemyChampion: {
      name: 'Zed [Bot]',
      x: 520,
      y: 220,
      hp: 540,
      maxHp: 540,
      targetX: 520,
      targetY: 220,
      alive: true,
      respawnTimer: 0,
      attackCooldown: 0,
    },
    minions: [] as { team: 'blue' | 'red'; x: number; y: number; hp: number; maxHp: number }[],
    projectiles: [] as {
      team: 'blue' | 'red';
      x: number;
      y: number;
      vx: number;
      vy: number;
      damage: number;
      isTornado?: boolean;
    }[],
    turret: { x: 640, y: 220, hp: 1800, maxHp: 1800, range: 120, cooldown: 0 },
    mousePos: { x: 0, y: 0 },
    clickMarker: null as { x: number; y: number; timer: number } | null,
  });

  const spawnWave = useCallback(() => {
    const engine = gameRef.current;
    engine.minions.push(
      { team: 'blue', x: 60, y: 190, hp: 450, maxHp: 450 },
      { team: 'blue', x: 60, y: 240, hp: 450, maxHp: 450 },
      { team: 'red', x: 600, y: 190, hp: 450, maxHp: 450 },
      { team: 'red', x: 600, y: 240, hp: 450, maxHp: 450 },
    );
  }, []);

  const triggerAnnouncement = (text: string) => {
    setAnnouncement(text);
    setTimeout(() => setAnnouncement(null), 3000);
  };

  // Q: Bão kiếm
  const castQ = useCallback(() => {
    const engine = gameRef.current;
    if (stats.cooldowns.q > 0 || engine.player.hp <= 0) return;
    if (soundEnabled) play('cyber_slash');
    const angle = Math.atan2(engine.mousePos.y - engine.player.y, engine.mousePos.x - engine.player.x);

    if (stats.qStacks >= 2) {
      engine.projectiles.push({
        team: 'blue',
        x: engine.player.x,
        y: engine.player.y,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7,
        damage: 180,
        isTornado: true,
      });
      setStats((prev) => ({
        ...prev,
        qStacks: 0,
        cooldowns: { ...prev.cooldowns, q: 3.5 },
      }));
    } else {
      let hitAny = false;
      const reach = 110;
      engine.minions.forEach((m) => {
        if (m.team === 'red' && Math.hypot(m.x - engine.player.x, m.y - engine.player.y) < reach) {
          m.hp -= 90;
          hitAny = true;
        }
      });
      if (
        engine.enemyChampion.alive &&
        Math.hypot(engine.enemyChampion.x - engine.player.x, engine.enemyChampion.y - engine.player.y) < reach
      ) {
        engine.enemyChampion.hp -= 110;
        hitAny = true;
      }
      setStats((prev) => ({
        ...prev,
        qStacks: hitAny ? Math.min(2, prev.qStacks + 1) : prev.qStacks,
        cooldowns: { ...prev.cooldowns, q: 2.5 },
      }));
    }
  }, [stats.cooldowns.q, stats.qStacks, soundEnabled]);

  // W: Tường gió
  const castW = useCallback(() => {
    const engine = gameRef.current;
    if (stats.cooldowns.w > 0 || engine.player.hp <= 0) return;
    if (soundEnabled) play('cyber_windwall');
    engine.player.windwallActive = 180;
    setStats((prev) => ({
      ...prev,
      cooldowns: { ...prev.cooldowns, w: 12 },
    }));
  }, [stats.cooldowns.w, soundEnabled]);

  // E: Quét kiếm
  const castE = useCallback(() => {
    const engine = gameRef.current;
    if (stats.cooldowns.e > 0 || engine.player.hp <= 0) return;
    if (soundEnabled) play('cyber_dash');
    const angle = Math.atan2(engine.mousePos.y - engine.player.y, engine.mousePos.x - engine.player.x);
    engine.player.x += Math.cos(angle) * 110;
    engine.player.y += Math.sin(angle) * 110;
    engine.player.targetX = engine.player.x;
    engine.player.targetY = engine.player.y;

    engine.minions.forEach((m) => {
      if (m.team === 'red' && Math.hypot(m.x - engine.player.x, m.y - engine.player.y) < 70) {
        m.hp -= 85;
      }
    });

    setStats((prev) => ({
      ...prev,
      cooldowns: { ...prev.cooldowns, e: 1.5 },
    }));
  }, [stats.cooldowns.e, soundEnabled]);

  // R: Trăn trối
  const castR = useCallback(() => {
    const engine = gameRef.current;
    if (stats.cooldowns.r > 0 || engine.player.hp <= 0 || !engine.enemyChampion.alive) return;
    if (soundEnabled) play('cyber_ult');
    engine.player.x = engine.enemyChampion.x - 30;
    engine.player.y = engine.enemyChampion.y;
    engine.player.targetX = engine.player.x;
    engine.player.targetY = engine.player.y;
    engine.enemyChampion.hp -= 280;

    setStats((prev) => ({
      ...prev,
      cooldowns: { ...prev.cooldowns, r: 35 },
    }));
  }, [stats.cooldowns.r, soundEnabled]);

  // D: Flash
  const castFlash = useCallback(() => {
    const engine = gameRef.current;
    if (stats.cooldowns.d > 0 || engine.player.hp <= 0) return;
    if (soundEnabled) play('pop');
    const angle = Math.atan2(engine.mousePos.y - engine.player.y, engine.mousePos.x - engine.player.x);
    engine.player.x += Math.cos(angle) * 140;
    engine.player.y += Math.sin(angle) * 140;
    engine.player.targetX = engine.player.x;
    engine.player.targetY = engine.player.y;

    setStats((prev) => ({
      ...prev,
      cooldowns: { ...prev.cooldowns, d: 45 },
    }));
  }, [stats.cooldowns.d, soundEnabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'q') castQ();
      else if (k === 'w') castW();
      else if (k === 'e') castE();
      else if (k === 'r') castR();
      else if (k === 'd') castFlash();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [castQ, castW, castE, castR, castFlash]);

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    spawnWave();
    let lastTick = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const engine = gameRef.current;
      const { player, enemyChampion: zed, turret } = engine;

      setStats((prev) => {
        let changed = false;
        const nextCd = { ...prev.cooldowns };
        (Object.keys(nextCd) as (keyof typeof nextCd)[]).forEach((k) => {
          if (nextCd[k] > 0) {
            nextCd[k] = Math.max(0, nextCd[k] - dt);
            changed = true;
          }
        });
        return changed ? { ...prev, cooldowns: nextCd } : prev;
      });

      // Background Summoner's Rift Mid Lane
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f3854';
      ctx.fillRect(280, 0, 120, canvas.height);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 160, canvas.width, 120);

      // Turret
      if (turret.hp > 0) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(turret.x - 18, turret.y - 36, 36, 60);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(turret.x - 12, turret.y - 30, 24, 12);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(turret.x - 25, turret.y - 48, 50, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(turret.x - 24, turret.y - 47, (48 * Math.max(0, turret.hp)) / turret.maxHp, 4);

        turret.cooldown -= dt;
        if (turret.cooldown <= 0) {
          const target = engine.minions.find(
            (m) => m.team === 'blue' && Math.hypot(m.x - turret.x, m.y - turret.y) < turret.range,
          );
          if (target) {
            engine.projectiles.push({
              team: 'red',
              x: turret.x,
              y: turret.y,
              vx: (target.x - turret.x) * 0.05,
              vy: (target.y - turret.y) * 0.05,
              damage: 60,
            });
            turret.cooldown = 1.2;
          }
        }
      } else if (!victory) {
        setVictory(true);
        triggerAnnouncement('VICTORY · CHIẾN THẮNG TRẬN ĐẤU!');
        if (soundEnabled) play('cyber_victory');
      }

      // Player Movement
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > player.speed) {
        player.x += (dx / dist) * player.speed;
        player.y += (dy / dist) * player.speed;
      }

      // Windwall
      if (player.windwallActive > 0) {
        player.windwallActive--;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x + 30, player.y, 40, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
      }

      // Click Marker
      if (engine.clickMarker) {
        engine.clickMarker.timer--;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          engine.clickMarker.x,
          engine.clickMarker.y,
          12 - engine.clickMarker.timer / 2,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        if (engine.clickMarker.timer <= 0) engine.clickMarker = null;
      }

      // Minions
      engine.minions = engine.minions.filter((m) => m.hp > 0);
      engine.minions.forEach((m) => {
        const enemy = engine.minions.find((o) => o.team !== m.team && Math.hypot(o.x - m.x, o.y - m.y) < 40);
        if (!enemy) {
          m.x += m.team === 'blue' ? 0.8 : -0.8;
        } else {
          enemy.hp -= 0.5;
        }

        ctx.fillStyle = m.team === 'blue' ? '#38bdf8' : '#ef4444';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Zed
      if (zed.alive) {
        const zdist = Math.hypot(zed.targetX - zed.x, zed.targetY - zed.y);
        if (zdist > 2) {
          zed.x += ((zed.targetX - zed.x) / zdist) * 2.2;
          zed.y += ((zed.targetY - zed.y) / zdist) * 2.2;
        }

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(zed.x, zed.y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(zed.x - 18, zed.y - 18, 36, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(zed.x - 18, zed.y - 18, (36 * Math.max(0, zed.hp)) / zed.maxHp, 4);

        if (zed.hp <= 0) {
          zed.alive = false;
          zed.respawnTimer = 10;
          triggerAnnouncement('FIRST BLOOD! YOU HAVE SLAIN ZED!');
          if (soundEnabled) play('coin');
          setStats((prev) => ({
            ...prev,
            kills: prev.kills + 1,
            gold: prev.gold + 300,
            level: Math.min(6, prev.level + 1),
          }));
        }
      } else {
        zed.respawnTimer -= dt;
        if (zed.respawnTimer <= 0) {
          zed.alive = true;
          zed.hp = zed.maxHp;
          zed.x = 600;
          zed.y = 220;
        }
      }

      // Projectiles
      engine.projectiles = engine.projectiles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.isTornado) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.stroke();

          if (zed.alive && Math.hypot(zed.x - p.x, zed.y - p.y) < 25) {
            zed.hp -= p.damage;
            return false;
          }
        } else {
          ctx.fillStyle = p.team === 'blue' ? '#38bdf8' : '#ef4444';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        return p.x >= 0 && p.x <= canvas.width && p.y >= 0 && p.y <= canvas.height;
      });

      // Yasuo
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(player.x - 20, player.y - 18, 40, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(player.x - 20, player.y - 18, (40 * Math.max(0, player.hp)) / player.maxHp, 4);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [spawnWave, soundEnabled, stats.level, stats.qStacks, victory]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#090d16' }}>
      <div
        className="row"
        style={{
          height: 32,
          background: '#0a0f1d',
          borderBottom: '1px solid #1e293b',
          padding: '0 16px',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <div className="row" style={{ gap: 12 }}>
          <span style={{ color: '#38bdf8', fontWeight: 800 }}>⚔️ Yasuo · K/D: {stats.kills}/0</span>
          <span style={{ color: '#34d399' }}>CS: {stats.cs}</span>
          <span style={{ color: '#fbbf24' }}>Vàng: {stats.gold} G</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            play('pop');
            spawnWave();
          }}
          style={{ fontSize: 10, padding: '2px 8px' }}
        >
          Gọi Đợt Lính
        </Button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={720}
          height={380}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            gameRef.current.player.targetX = x;
            gameRef.current.player.targetY = y;
            gameRef.current.clickMarker = { x, y, timer: 15 };
            if (soundEnabled) play('click');
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            gameRef.current.mousePos = {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            };
          }}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        />
        {announcement && (
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(15, 23, 42, 0.95)',
              padding: '10px 30px',
              border: '2px solid #facc15',
              color: '#facc15',
              fontSize: 18,
              fontWeight: 900,
              pointerEvents: 'none',
            }}
          >
            {announcement}
          </div>
        )}
      </div>

      <div
        className="row"
        style={{
          height: 60,
          background: '#090d16',
          borderTop: '1px solid #1e293b',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <button onClick={castQ} className="btn-skill" title="Bão Kiếm [Q]">
          Q · Bão Kiếm {stats.qStacks > 0 && `(${stats.qStacks})`}
        </button>
        <button onClick={castW} className="btn-skill" title="Tường Gió [W]">
          W · Tường Gió
        </button>
        <button onClick={castE} className="btn-skill" title="Quét Kiếm [E]">
          E · Quét Kiếm
        </button>
        <button onClick={castR} className="btn-skill" title="Trăn Trối [R]">
          R · Trăn Trối
        </button>
        <button onClick={castFlash} className="btn-skill" title="Tốc Biến [D]">
          D · Tốc Biến
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// GAME 2: "VALORAN" (Playable Tactical FPS with FULL WASD MOVEMENT)
// -------------------------------------------------------------

// 16x16 Site A Tactical Map
// 0 = Floor, 1 = Slate Wall, 2 = Radianite Green Box, 3 = Wooden Crate
const VAL_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 2, 0, 1, 0, 2, 2, 0, 3, 0, 1, 0, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 0, 0, 0, 3, 3, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 3, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 2, 2, 0, 1, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

interface BotAgent {
  name: string;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  color: string;
  threatTimer: number;
}

function ValorantGameWindow({ soundEnabled }: { soundEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Player State with WASD Movement Coordinates
  const [valState, setValState] = useState({
    hp: 100,
    shield: 50,
    ammo: 25,
    maxAmmo: 25,
    reserveAmmo: 75,
    kills: 0,
    headshots: 0,
    score: 0,
    reloading: false,
  });

  const [killBanner, setKillBanner] = useState<string | null>(null);

  const engineRef = useRef({
    player: {
      x: 7.5,
      y: 13.5,
      angle: -Math.PI / 2, // Facing North towards Site A
      speed: 3.5,
      isMoving: false,
      walkBob: 0,
      recoil: 0,
      muzzleFlash: 0,
    },
    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      left: false,
      right: false,
      shift: false,
    },
    bots: [
      { name: 'Jett', x: 7.5, y: 3.5, hp: 100, alive: true, color: '#38bdf8', threatTimer: 2.2 },
      { name: 'Reyna', x: 13.5, y: 5.5, hp: 100, alive: true, color: '#c084fc', threatTimer: 2.5 },
      { name: 'Phoenix', x: 3.5, y: 6.5, hp: 100, alive: true, color: '#f97316', threatTimer: 2.0 },
      { name: 'Omen', x: 10.5, y: 2.5, hp: 100, alive: true, color: '#6366f1', threatTimer: 2.4 },
    ] as BotAgent[],
    footstepCooldown: 0,
  });

  // Reload
  const handleReload = useCallback(() => {
    if (valState.reloading || valState.ammo === valState.maxAmmo || valState.reserveAmmo <= 0) return;
    if (soundEnabled) play('pop');
    setValState((prev) => ({ ...prev, reloading: true }));
    setTimeout(() => {
      setValState((prev) => {
        const needed = prev.maxAmmo - prev.ammo;
        const take = Math.min(needed, prev.reserveAmmo);
        return {
          ...prev,
          ammo: prev.ammo + take,
          reserveAmmo: prev.reserveAmmo - take,
          reloading: false,
        };
      });
      if (soundEnabled) play('click');
    }, 1500);
  }, [valState.reloading, valState.ammo, valState.maxAmmo, valState.reserveAmmo, soundEnabled]);

  // Key listeners for WASD movement and arrow keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const keys = engineRef.current.keys;
      if (k === 'w') keys.w = true;
      if (k === 'a') keys.a = true;
      if (k === 's') keys.s = true;
      if (k === 'd') keys.d = true;
      if (e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'ArrowRight') keys.right = true;
      if (e.key === 'Shift') keys.shift = true;
      if (k === 'r') handleReload();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const keys = engineRef.current.keys;
      if (k === 'w') keys.w = false;
      if (k === 'a') keys.a = false;
      if (k === 's') keys.s = false;
      if (k === 'd') keys.d = false;
      if (e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'ArrowRight') keys.right = false;
      if (e.key === 'Shift') keys.shift = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleReload]);

  // Mouse turning on canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Rotate view angle smoothly with mouse movement
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    engineRef.current.player.angle += relativeX * 0.04;
  };

  // Shoot
  const handleShoot = () => {
    if (valState.reloading) return;
    if (valState.ammo <= 0) {
      handleReload();
      return;
    }

    const { player, bots } = engineRef.current;
    player.muzzleFlash = 4;
    player.recoil = 12;
    if (soundEnabled) play('cyber_shot');

    setValState((prev) => ({ ...prev, ammo: prev.ammo - 1 }));

    // Cast ray from center of screen to check enemy hit
    const centerAngle = player.angle;
    for (const bot of bots) {
      if (!bot.alive) continue;
      const dx = bot.x - player.x;
      const dy = bot.y - player.y;
      const dist = Math.hypot(dx, dy);
      let angleToBot = Math.atan2(dy, dx) - centerAngle;
      while (angleToBot < -Math.PI) angleToBot += Math.PI * 2;
      while (angleToBot > Math.PI) angleToBot -= Math.PI * 2;

      // Center crosshair alignment check
      if (Math.abs(angleToBot) < 0.12 && dist < 12) {
        // Headshot RNG / precision check:
        const isHeadshot = Math.random() < 0.65;
        if (isHeadshot) {
          bot.hp = 0;
          bot.alive = false;
          if (soundEnabled) play('cyber_headshot');
          setKillBanner(`HEADSHOT! 💥 ${bot.name} ELIMINATED!`);
          setTimeout(() => setKillBanner(null), 1800);
          setValState((prev) => ({
            ...prev,
            kills: prev.kills + 1,
            headshots: prev.headshots + 1,
            score: prev.score + 150,
          }));
        } else {
          bot.hp -= 40;
          if (soundEnabled) play('bite');
          if (bot.hp <= 0) {
            bot.alive = false;
            setKillBanner(`ELIMINATED! ${bot.name}`);
            setTimeout(() => setKillBanner(null), 1800);
            setValState((prev) => ({
              ...prev,
              kills: prev.kills + 1,
              score: prev.score + 100,
            }));
          }
        }
        return;
      }
    }
  };

  // 3D Raycasting Engine Render Loop with WASD Walking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let lastTime = performance.now();

    const isWall = (x: number, y: number) => {
      const mx = Math.floor(x);
      const my = Math.floor(y);
      if (mx < 0 || mx >= 16 || my < 0 || my >= 16) return true;
      return (VAL_MAP[my]?.[mx] ?? 0) > 0;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const engine = engineRef.current;
      const { player, keys, bots } = engine;

      // Keyboard Turning
      if (keys.left) player.angle -= 2.5 * dt;
      if (keys.right) player.angle += 2.5 * dt;

      // WASD Movement
      const moveSpeed = (keys.shift ? 1.8 : player.speed) * dt;
      let moved = false;

      if (keys.w) {
        const nx = player.x + Math.cos(player.angle) * moveSpeed;
        const ny = player.y + Math.sin(player.angle) * moveSpeed;
        if (!isWall(nx, player.y)) player.x = nx;
        if (!isWall(player.x, ny)) player.y = ny;
        moved = true;
      }
      if (keys.s) {
        const nx = player.x - Math.cos(player.angle) * moveSpeed;
        const ny = player.y - Math.sin(player.angle) * moveSpeed;
        if (!isWall(nx, player.y)) player.x = nx;
        if (!isWall(player.x, ny)) player.y = ny;
        moved = true;
      }
      if (keys.a) {
        const nx = player.x + Math.sin(player.angle) * moveSpeed;
        const ny = player.y - Math.cos(player.angle) * moveSpeed;
        if (!isWall(nx, player.y)) player.x = nx;
        if (!isWall(player.x, ny)) player.y = ny;
        moved = true;
      }
      if (keys.d) {
        const nx = player.x - Math.sin(player.angle) * moveSpeed;
        const ny = player.y + Math.cos(player.angle) * moveSpeed;
        if (!isWall(nx, player.y)) player.x = nx;
        if (!isWall(player.x, ny)) player.y = ny;
        moved = true;
      }

      player.isMoving = moved;
      if (moved) {
        player.walkBob += 12 * dt;
        engine.footstepCooldown -= dt;
        if (engine.footstepCooldown <= 0) {
          if (soundEnabled && !keys.shift) play('click');
          engine.footstepCooldown = 0.35;
        }
      } else {
        player.walkBob *= 0.8;
      }

      if (player.recoil > 0) player.recoil *= 0.82;

      // Render 3D Scene
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
      skyGrad.addColorStop(0, '#0369a1');
      skyGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

      // Floor
      const floorGrad = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
      floorGrad.addColorStop(0, '#334155');
      floorGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

      // Raycasting 3D Walls
      const fov = Math.PI / 3;
      const numRays = 180;
      const rayStep = canvas.width / numRays;
      const zBuffer = new Array<number>(numRays);

      for (let i = 0; i < numRays; i++) {
        const rayAngle = player.angle - fov / 2 + (i / numRays) * fov;
        const cosAngle = Math.cos(rayAngle);
        const sinAngle = Math.sin(rayAngle);

        let dist = 0;
        let hitType = 0;

        while (dist < 16) {
          dist += 0.05;
          const cx = player.x + cosAngle * dist;
          const cy = player.y + sinAngle * dist;
          const mx = Math.floor(cx);
          const my = Math.floor(cy);

          if (mx < 0 || mx >= 16 || my < 0 || my >= 16) {
            hitType = 1;
            break;
          }
          const cell = VAL_MAP[my]?.[mx] ?? 0;
          if (cell > 0) {
            hitType = cell;
            break;
          }
        }

        // Correct fish-eye
        const correctedDist = dist * Math.cos(rayAngle - player.angle);
        zBuffer[i] = correctedDist;

        const wallHeight = Math.min(canvas.height, (canvas.height / correctedDist) * 0.9);
        const wallTop = (canvas.height - wallHeight) / 2;

        // Wall colors
        if (hitType === 2) {
          // Radianite Green Box
          ctx.fillStyle = `rgb(4, ${Math.floor(180 - correctedDist * 8)}, ${Math.floor(120 - correctedDist * 6)})`;
        } else if (hitType === 3) {
          // Wooden Crate
          ctx.fillStyle = `rgb(${Math.floor(180 - correctedDist * 10)}, ${Math.floor(110 - correctedDist * 6)}, 40)`;
        } else {
          // Concrete Slate Wall
          const c = Math.max(20, Math.floor(120 - correctedDist * 8));
          ctx.fillStyle = `rgb(${c}, ${c + 10}, ${c + 20})`;
        }

        ctx.fillRect(i * rayStep, wallTop, rayStep + 1, wallHeight);
      }

      // Project Enemy 3D Sprites
      bots.forEach((bot) => {
        if (!bot.alive) return;
        const dx = bot.x - player.x;
        const dy = bot.y - player.y;
        const dist = Math.hypot(dx, dy);

        let spriteAngle = Math.atan2(dy, dx) - player.angle;
        while (spriteAngle < -Math.PI) spriteAngle += Math.PI * 2;
        while (spriteAngle > Math.PI) spriteAngle -= Math.PI * 2;

        if (Math.abs(spriteAngle) < fov) {
          const screenX = canvas.width / 2 + Math.tan(spriteAngle) * (canvas.width / 2);
          const spriteHeight = Math.min(canvas.height * 0.9, (canvas.height / dist) * 0.85);
          const spriteWidth = spriteHeight * 0.45;
          const spriteTop = (canvas.height - spriteHeight) / 2;

          const rayIdx = Math.floor((screenX / canvas.width) * numRays);
          if (rayIdx >= 0 && rayIdx < numRays && dist < (zBuffer[rayIdx] ?? 999)) {
            // Body
            ctx.fillStyle = bot.color;
            ctx.fillRect(
              screenX - spriteWidth / 2,
              spriteTop + spriteHeight * 0.2,
              spriteWidth,
              spriteHeight * 0.8,
            );

            // Head (1-tap golden headshot target)
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath();
            ctx.arc(screenX, spriteTop + spriteHeight * 0.12, spriteWidth * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Name
            ctx.font = '800 11px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(bot.name, screenX, spriteTop - 8);

            // HP bar
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(screenX - 16, spriteTop - 4, 32, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(screenX - 16, spriteTop - 4, (32 * bot.hp) / 100, 4);
          }
        }
      });

      // Vandal Gun Viewmodel (with rhythmic walking bob)
      const bobX = Math.cos(player.walkBob) * 12;
      const bobY = Math.abs(Math.sin(player.walkBob)) * 14;
      const gunX = canvas.width - 200 + bobX;
      const gunY = canvas.height - 130 + bobY + player.recoil;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(gunX, gunY, 160, 60);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(gunX + 15, gunY + 12, 100, 10);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(gunX - 40, gunY + 16, 45, 12);

      // Muzzle flash
      if (player.muzzleFlash > 0) {
        player.muzzleFlash--;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(gunX - 46, gunY + 22, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(gunX - 46, gunY + 22, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crosshair
      const chX = canvas.width / 2;
      const chY = canvas.height / 2;
      const spread = (player.isMoving ? 12 : 5) + player.recoil;

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(chX, chY - spread);
      ctx.lineTo(chX, chY - spread - 8);
      ctx.moveTo(chX, chY + spread);
      ctx.lineTo(chX, chY + spread + 8);
      ctx.moveTo(chX - spread, chY);
      ctx.lineTo(chX - spread - 8, chY);
      ctx.moveTo(chX + spread, chY);
      ctx.lineTo(chX + spread + 8, chY);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(chX - 1, chY - 1, 2, 2);

      // Radar Minimap (Top-Left)
      const mapSize = 90;
      const mapX = 14;
      const mapY = 14;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(mapX, mapY, mapSize, mapSize);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(mapX, mapY, mapSize, mapSize);

      // Draw map grid
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          const cell = VAL_MAP[r]?.[c] ?? 0;
          if (cell > 0) {
            ctx.fillStyle = cell === 2 ? '#34d399' : '#475569';
            ctx.fillRect(mapX + (c * mapSize) / 16, mapY + (r * mapSize) / 16, mapSize / 16, mapSize / 16);
          }
        }
      }

      // Draw player arrow on radar
      const pRadarX = mapX + (player.x * mapSize) / 16;
      const pRadarY = mapY + (player.y * mapSize) / 16;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pRadarX, pRadarY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(pRadarX, pRadarY);
      ctx.lineTo(pRadarX + Math.cos(player.angle) * 8, pRadarY + Math.sin(player.angle) * 8);
      ctx.stroke();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [soundEnabled]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#090d16' }}>
      {/* Top HUD */}
      <div
        className="row"
        style={{
          height: 34,
          background: '#0a0f1d',
          borderBottom: '1px solid #1e293b',
          padding: '0 16px',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <div className="row" style={{ gap: 16 }}>
          <span style={{ color: '#f43f5e', fontWeight: 900 }}>🎯 VANDAL · SITE A HAVEN</span>
          <span style={{ color: '#fbbf24' }}>Hạ Gục: {valState.kills}</span>
          <span style={{ color: '#34d399' }}>Headshot: {valState.headshots}</span>
          <span style={{ color: '#38bdf8' }}>Điểm: {valState.score}</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Di chuyển: [W][A][S][D] · Nạp đạn: [R]</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              engineRef.current.bots.forEach((b) => {
                b.hp = 100;
                b.alive = true;
              });
              engineRef.current.player.x = 7.5;
              engineRef.current.player.y = 13.5;
            }}
            style={{ fontSize: 10, padding: '2px 8px' }}
          >
            <RotateCcw size={12} /> Hồi Sinh Bots
          </Button>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={720}
          height={390}
          onClick={handleShoot}
          onMouseMove={handleMouseMove}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'none' }}
        />

        {killBanner && (
          <div
            style={{
              position: 'absolute',
              top: '25%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(244, 63, 94, 0.95)',
              color: '#ffffff',
              padding: '8px 24px',
              borderRadius: 6,
              fontWeight: 900,
              fontSize: 18,
              boxShadow: '0 0 24px rgba(244, 63, 94, 0.9)',
              pointerEvents: 'none',
            }}
          >
            {killBanner}
          </div>
        )}
      </div>

      {/* Bottom Ammo HUD */}
      <div
        className="row"
        style={{
          height: 52,
          background: '#090d16',
          borderTop: '1px solid #1e293b',
          padding: '0 24px',
          justifyContent: 'space-between',
        }}
      >
        <div className="row" style={{ gap: 20 }}>
          <div className="row" style={{ gap: 6 }}>
            <Shield size={16} color="#38bdf8" />
            <span style={{ fontSize: 16, fontWeight: 900, color: '#38bdf8' }}>{valState.shield}</span>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#22c55e' }}>+ {valState.hp}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
            {valState.reloading ? 'RELOADING...' : `${valState.ammo} / ${valState.reserveAmmo}`}
          </span>
          <Button variant="secondary" size="sm" onClick={handleReload}>
            Nạp Đạn [R]
          </Button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// APP: GỌI MÓN BẾP NET
// -------------------------------------------------------------

function FoodOrderWindow({
  cart,
  setCart,
  note,
  setNote,
  orders,
  onPlaceOrder,
}: {
  cart: Record<string, number>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  note: string;
  setNote: (s: string) => void;
  orders: { id: string; name: string; time: string; status: string }[];
  onPlaceOrder: () => void;
}) {
  const [category, setCategory] = useState<'all' | 'food' | 'drink' | 'combo'>('all');
  const filtered = MENU_ITEMS.filter((i) => (category === 'all' ? true : i.category === category));

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const updateQty = (id: string, delta: number) => {
    play('click');
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#090d16', color: '#f8fafc' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b' }}>
        <div className="row" style={{ padding: '8px 12px', gap: 8, borderBottom: '1px solid #1e293b' }}>
          {(['all', 'food', 'drink', 'combo'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                background: category === cat ? '#0284c7' : 'rgba(30, 41, 59, 0.6)',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                color: category === cat ? '#fff' : '#94a3b8',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {cat === 'all'
                ? 'Tất Cả Món'
                : cat === 'food'
                  ? 'Mì & Cơm Nóng'
                  : cat === 'drink'
                    ? 'Nước Uống'
                    : 'Combo'}
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {filtered.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  padding: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 13 }}>{item.name}</span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: 9,
                          background: '#ea580c',
                          color: '#fff',
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#facc15', marginTop: 4 }}>
                    {item.price.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="row" style={{ gap: 6 }}>
                  {qty > 0 && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateQty(item.id, -1)}
                        style={{ width: 24, height: 24, padding: 0 }}
                      >
                        -
                      </Button>
                      <span style={{ fontWeight: 800, width: 20, textAlign: 'center', fontSize: 12 }}>
                        {qty}
                      </span>
                    </>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => updateQty(item.id, 1)}
                    style={{ fontSize: 11 }}
                  >
                    + Thêm
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: 270, display: 'flex', flexDirection: 'column', padding: 12 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#38bdf8' }}>Giỏ Hàng Gọi Món</h4>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {Object.keys(cart).length === 0 ? (
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 24 }}>
              Chưa chọn món nào. Hãy thêm mì xào hoặc Sting dâu!
            </div>
          ) : (
            Object.entries(cart).map(([id, qty]) => {
              const item = MENU_ITEMS.find((m) => m.id === id);
              if (!item) return null;
              return (
                <div
                  key={id}
                  className="row"
                  style={{
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #1e293b',
                    fontSize: 11,
                  }}
                >
                  <span>
                    {qty}x {item.name}
                  </span>
                  <span style={{ color: '#facc15', fontWeight: 800 }}>
                    {(qty * item.price).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Ghi chú (ít cay, trứng lòng đào...)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            style={{ width: '100%', fontSize: 11 }}
          />
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700 }}>Tổng Tiền:</span>
          <span style={{ fontWeight: 900, fontSize: 15, color: '#facc15' }}>
            {total.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <Button variant="primary" onClick={onPlaceOrder} style={{ width: '100%', marginBottom: 12 }}>
          <ShoppingBag size={14} /> Gửi Đặt Món Đến Bếp
        </Button>

        {orders.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>ĐƠN ĐÃ GỬI</div>
            {orders.slice(0, 3).map((o) => (
              <div
                key={o.id}
                style={{
                  background: '#1e293b',
                  padding: '4px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  marginBottom: 4,
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: '#38bdf8' }}>{o.id}</span>
                  <span style={{ color: '#34d399' }}>{o.status}</span>
                </div>
                <div>{o.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// APP: CẤU HÌNH MÁY (SPECS)
// -------------------------------------------------------------

function SpecsWindow({ station }: { station: string }) {
  return (
    <div style={{ padding: 18, height: '100%', overflowY: 'auto', background: '#090d16', color: '#f8fafc' }}>
      <div className="row" style={{ gap: 10, marginBottom: 16 }}>
        <Cpu size={28} color="#38bdf8" />
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: '#38bdf8' }}>HỆ THỐNG MÁY TRẠM ESPORTS - {station}</h3>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Cyber Game HNT Trảng Dài · Windows 11 Pro 64-bit Bản Quyền
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <SpecCard label="CPU" value="Intel Core i7-14700K (20 Cores 28 Threads, Turbo 5.60 GHz)" />
        <SpecCard label="GPU" value="NVIDIA GeForce RTX 4070 Ti SUPER 16GB GDDR6X" />
        <SpecCard label="RAM" value="32GB (2x16GB) Kingston Fury Beast DDR5 6000MHz RGB" />
        <SpecCard label="MÀN HÌNH" value="ASUS ROG Swift 27'' Fast IPS 280Hz 0.5ms G-Sync" />
      </div>

      <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b' }}>CPU TẢI</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>22 %</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b' }}>NHIỆT ĐỘ GPU</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8' }}>48 °C</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b' }}>QUẠT TẢN NHIỆT</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#c084fc' }}>1420 RPM</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b' }}>PING RIOT SERVER</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>4 ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#0f172a', padding: 10, borderRadius: 6, border: '1px solid #1e293b' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
    </div>
  );
}

// -------------------------------------------------------------
// APP: GOOGLE CHROME
// -------------------------------------------------------------

function BrowserWindow() {
  const [tab, setTab] = useState<'news' | 'tips'>('news');

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#090d16',
        color: '#f8fafc',
      }}
    >
      <div
        className="row"
        style={{
          height: 36,
          background: '#0a0f1d',
          borderBottom: '1px solid #1e293b',
          padding: '0 12px',
          gap: 10,
        }}
      >
        <button
          onClick={() => setTab('news')}
          style={{
            background: tab === 'news' ? '#1e293b' : 'transparent',
            border: 'none',
            color: tab === 'news' ? '#38bdf8' : '#94a3b8',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Tin Tức LMHT 14.x
        </button>
        <button
          onClick={() => setTab('tips')}
          style={{
            background: tab === 'tips' ? '#1e293b' : 'transparent',
            border: 'none',
            color: tab === 'tips' ? '#38bdf8' : '#94a3b8',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Mẹo Bắn Valorant
        </button>
        <div
          style={{
            flex: 1,
            background: '#090d16',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 11,
            color: '#64748b',
          }}
        >
          https://cybergame-hnt.vn/{tab}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'news' ? (
          <div>
            <h3 style={{ margin: '0 0 10px', color: '#38bdf8' }}>Cập Nhật Phiên Bản LMHT 14.x</h3>
            <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
              Bản cập nhật mới tối ưu hóa sát thương các tướng đường giữa! Giải đấu Sinh Viên DNTU Open Cup
              sắp chính thức mở đăng ký với giải thưởng 20,000,000 VNĐ tại Cyber Game HNT!
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ margin: '0 0 10px', color: '#f43f5e' }}>Bí Quyết Kê Tâm Headshot 90% Valorant</h3>
            <ul style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.8, paddingLeft: 20 }}>
              <li>
                Dùng phím [W][A][S][D] di chuyển và dừng lại (counter-strafe) trước khi nhấp bắn để đạn đi
                chuẩn xác 100%.
              </li>
              <li>Tâm ngắm luôn đặt ngang đầu kẻ địch khi kê góc Site A.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// APP: ZING MP3 MUSIC
// -------------------------------------------------------------

function MusicWindow({ soundEnabled }: { soundEnabled: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  const playlist = [
    { title: 'Legends Never Die (Cyber HNT Synth Remix)', artist: 'Against The Current' },
    { title: 'Biên Hòa Về Đêm (Lofi Chill Gaming)', artist: 'Trảng Dài Beatmakers' },
    { title: 'Warriors - Esports Anthem', artist: 'Imagine Dragons' },
  ];

  const current = playlist[trackIndex] ?? playlist[0]!;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #090d16 100%)',
        color: '#f8fafc',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: '50%',
          background: '#a855f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Music size={34} color="#ffffff" />
      </div>

      <h3 style={{ margin: '0 0 4px', fontSize: 15, textAlign: 'center' }}>{current.title}</h3>
      <div style={{ color: '#c084fc', fontSize: 12, marginBottom: 16 }}>{current.artist}</div>

      <div className="row" style={{ gap: 12 }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            play('click');
            setTrackIndex((prev) => (prev > 0 ? prev - 1 : playlist.length - 1));
          }}
        >
          Trước
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (soundEnabled) play('pop');
            setIsPlaying((prev) => !prev);
          }}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />} {isPlaying ? 'Tạm Dừng' : 'Phát'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            play('click');
            setTrackIndex((prev) => (prev < playlist.length - 1 ? prev + 1 : 0));
          }}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// APP: THÙNG RÁC
// -------------------------------------------------------------

function RecycleBinWindow() {
  return (
    <div style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>
      <Trash2 size={44} color="#64748b" style={{ margin: '0 auto 12px' }} />
      <h3 style={{ color: '#f1f5f9', margin: '0 0 8px' }}>Thùng Rác Windows 11</h3>
      <p style={{ fontSize: 12 }}>Chỉ còn lưu trữ: Bí_Kíp_Yasuo_Gank_Team_15p_GG.docx</p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          play('pop');
          useUi.getState().toast({
            kind: 'success',
            title: 'Đã Dọn Rác!',
            body: 'Giải phóng 52.4 GB bộ nhớ đệm trên ổ C:.',
          });
        }}
      >
        Empty Recycle Bin
      </Button>
    </div>
  );
}

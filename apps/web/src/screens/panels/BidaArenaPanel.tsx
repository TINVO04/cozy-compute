import {
  BALL_RADIUS,
  calculateAimPrediction,
  createCaromRack,
  createStandard8BallRack,
  createStandardPockets,
  DEFAULT_TABLE_BOUNDS,
  resetCueBallInKitchen,
  stepBilliardsPhysics,
  type BidaBall,
} from '@cozy/game-data';
import { ChevronLeft, Play, RefreshCw, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { net } from '../../game/net';
import { type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, CoinIcon } from '../../ui/primitives';

export interface TableSummary {
  id: string;
  name: string;
  mode: '8ball' | 'carom' | 'practice';
  hostId: string;
  hostName: string;
  guestId?: string;
  guestName?: string;
  status: 'waiting' | 'playing' | 'finished';
  score1: number;
  score2: number;
  turn: string;
  isAi?: boolean;
  isLocal2P?: boolean;
}

interface ActiveMatch {
  id: string;
  name: string;
  mode: '8ball' | 'carom' | 'practice';
  hostId: string;
  hostName: string;
  guestId?: string;
  guestName?: string;
  status: 'waiting' | 'playing' | 'finished';
  turn: string;
  score1: number;
  score2: number;
  balls: BidaBall[];
  winner?: string;
  winnerName?: string;
  isAi?: boolean;
  isLocal2P?: boolean;
}

const DEFAULT_CLUB_TABLES: TableSummary[] = [
  {
    id: 'tbl_ai_minh_long',
    name: 'Bàn 01 · Giao Lưu Tranh Cúp',
    mode: '8ball',
    hostId: 'ai_minh_long',
    hostName: 'Minh Long (Cơ Thủ Hạng A)',
    status: 'waiting',
    score1: 0,
    score2: 0,
    turn: 'me',
    isAi: true,
  },
  {
    id: 'tbl_local_2p',
    name: 'Bàn 02 · Đấu 2 Người (Cùng Máy)',
    mode: '8ball',
    hostId: 'p1',
    hostName: 'Cơ Thủ 1 (Bạn)',
    guestId: 'p2',
    guestName: 'Cơ Thủ 2 (Đối thủ)',
    status: 'waiting',
    score1: 0,
    score2: 0,
    turn: 'p1',
    isLocal2P: true,
  },
  {
    id: 'tbl_ai_huy',
    name: 'Bàn 03 · Carom 3 Băng Quốc Tế',
    mode: 'carom',
    hostId: 'ai_huy',
    hostName: 'Trọng Tài Huy',
    status: 'waiting',
    score1: 0,
    score2: 0,
    turn: 'me',
    isAi: true,
  },
];

export function BidaArenaPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const [serverTables, setServerTables] = useState<TableSummary[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [creating, setCreating] = useState(false);
  const [tableName, setTableName] = useState(`Bàn của ${me.displayName}`);
  const [tableType, setTableType] = useState<'8ball_2p' | '8ball_ai' | 'carom_ai' | 'practice' | 'online'>(
    '8ball_2p',
  );

  // Combined tables: server tables + default club tables
  const tables = [
    ...serverTables,
    ...DEFAULT_CLUB_TABLES.filter((d) => !serverTables.some((s) => s.id === d.id)),
  ];

  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(30);
  const [isCharging, setIsCharging] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [winModal, setWinModal] = useState<{ winnerId: string; winnerName: string; reason: string } | null>(
    null,
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const ballsRef = useRef<BidaBall[]>([]);
  const activeMatchRef = useRef<ActiveMatch | null>(null);
  activeMatchRef.current = activeMatch;
  const powerDirectionRef = useRef<1 | -1>(1);

  useEffect(() => {
    net.send('bida:get_tables', {});

    const unsubTables = net.onRoomMessage<TableSummary[]>('bida:tables_update', (list) => {
      if (Array.isArray(list)) {
        setServerTables(list);
      }
    });

    const unsubJoined = net.onRoomMessage<ActiveMatch>('bida:table_joined', (match) => {
      ballsRef.current = match.balls;
      setActiveMatch(match);
      setWinModal(null);
    });

    const unsubStart = net.onRoomMessage<ActiveMatch>('bida:table_start', (match) => {
      ballsRef.current = match.balls;
      setActiveMatch(match);
      setWinModal(null);
      play('pop');
    });

    const unsubOpponentAim = net.onRoomMessage<{ angle: number }>('bida:opponent_aim', (msg) => {
      setAimAngle(msg.angle);
    });

    const unsubShotExecuted = net.onRoomMessage<{ shooterId: string; angle: number; power: number }>(
      'bida:shot_executed',
      (msg) => {
        executeShotPhysics(msg.angle, msg.power, msg.shooterId);
      },
    );

    const unsubTurnChanged = net.onRoomMessage<{
      turn: string;
      scores: { score1: number; score2: number };
      scratch: boolean;
      balls: BidaBall[];
    }>('bida:turn_changed', (msg) => {
      if (activeMatchRef.current) {
        setActiveMatch({
          ...activeMatchRef.current,
          turn: msg.turn,
          score1: msg.scores.score1,
          score2: msg.scores.score2,
          balls: msg.balls,
        });
      }
      ballsRef.current = msg.balls;
      setIsSimulating(false);
      if (msg.scratch) {
        play('bida_cushion');
        useUi.getState().toast({
          kind: 'info',
          title: '⚠️ Lỗi Rơi Bi Cái (Scratch)',
          body: 'Bi cái bị rơi vào lỗ! Nhường lượt đánh cho đối thủ.',
        });
      }
    });

    const unsubGameOver = net.onRoomMessage<{ winnerId: string; winnerName: string; reason: string }>(
      'bida:game_over',
      (msg) => {
        setWinModal(msg);
        setIsSimulating(false);
        play('bida_win');
      },
    );

    return () => {
      unsubTables();
      unsubJoined();
      unsubStart();
      unsubOpponentAim();
      unsubShotExecuted();
      unsubTurnChanged();
      unsubGameOver();
    };
  }, []);

  useEffect(() => {
    if (!activeMatch) return;

    let running = true;
    const render = () => {
      if (!running) return;
      drawTable();
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  });

  const isMyTurn = Boolean(
    activeMatch &&
    (activeMatch.mode === 'practice' ||
      activeMatch.isLocal2P ||
      (activeMatch.isAi && activeMatch.turn === 'me') ||
      activeMatch.turn === (net.room?.sessionId ?? 'me') ||
      (!activeMatch.guestId && activeMatch.hostId === (net.room?.sessionId ?? 'me'))),
  );

  const triggerShot = useCallback(() => {
    if (!activeMatch || !isMyTurn || isSimulating) return;

    if (net.isConnected() && !activeMatch.isAi && !activeMatch.isLocal2P && activeMatch.mode !== 'practice') {
      net.send('bida:shot', {
        tableId: activeMatch.id,
        angle: aimAngle,
        power,
      });
    } else {
      executeShotPhysics(aimAngle, power, activeMatch.turn);
    }
  }, [activeMatch, isMyTurn, isSimulating, aimAngle, power]);

  // AI Opponent bot logic
  useEffect(() => {
    if (!activeMatch || !activeMatch.isAi || activeMatch.turn !== 'ai' || isSimulating) return;

    const timer = setTimeout(() => {
      const pockets = createStandardPockets(DEFAULT_TABLE_BOUNDS);
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (!cue) return;

      const candidates = ballsRef.current.filter((b) => b.id > 0 && !b.pocketed && b.id !== 8);
      const pool =
        candidates.length > 0 ? candidates : ballsRef.current.filter((b) => b.id === 8 && !b.pocketed);
      if (pool.length === 0) return;

      const firstTarget = pool[0];
      const firstPocket = pockets[0];
      if (!firstTarget || !firstPocket) return;

      let bestTarget = firstTarget;
      let bestPocket = firstPocket;
      let bestDist = Infinity;

      for (const b of pool) {
        for (const p of pockets) {
          const d = Math.hypot(b.x - p.x, b.y - p.y);
          if (d < bestDist) {
            bestDist = d;
            bestTarget = b;
            bestPocket = p;
          }
        }
      }

      const pAngle = Math.atan2(bestPocket.y - bestTarget.y, bestPocket.x - bestTarget.x);
      const ghostX = bestTarget.x - Math.cos(pAngle) * BALL_RADIUS * 2;
      const ghostY = bestTarget.y - Math.sin(pAngle) * BALL_RADIUS * 2;
      const shotAngle = Math.atan2(ghostY - cue.y, ghostX - cue.x);
      const shotPow = Math.min(
        75,
        Math.max(30, Math.floor(Math.hypot(ghostX - cue.x, ghostY - cue.y) / 6) + 25),
      );

      setAimAngle(shotAngle);
      setPower(shotPow);

      setTimeout(() => {
        executeShotPhysics(shotAngle, shotPow, 'ai');
      }, 500);
    }, 800);

    return () => clearTimeout(timer);
  }, [activeMatch?.turn, isSimulating]);

  useEffect(() => {
    if (!activeMatch || !isMyTurn || isSimulating) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setAimAngle((a) => {
          const next = a - 0.03;
          if (net.isConnected() && !activeMatch.isAi && !activeMatch.isLocal2P) {
            net.send('bida:aim', { tableId: activeMatch.id, angle: next });
          }
          return next;
        });
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setAimAngle((a) => {
          const next = a + 0.03;
          if (net.isConnected() && !activeMatch.isAi && !activeMatch.isLocal2P) {
            net.send('bida:aim', { tableId: activeMatch.id, angle: next });
          }
          return next;
        });
      } else if (e.code === 'Space' && !e.repeat && !isCharging) {
        e.preventDefault();
        setIsCharging(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isCharging) {
        e.preventDefault();
        setIsCharging(false);
        triggerShot();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeMatch, isMyTurn, isSimulating, isCharging, triggerShot]);

  useEffect(() => {
    if (!isCharging) return;
    const interval = setInterval(() => {
      setPower((p) => {
        let dir = powerDirectionRef.current;
        if (p >= 98) {
          dir = -1;
          powerDirectionRef.current = -1;
        } else if (p <= 15) {
          dir = 1;
          powerDirectionRef.current = 1;
        }
        return Math.min(100, Math.max(10, p + dir * 3));
      });
    }, 25);
    return () => clearInterval(interval);
  }, [isCharging]);

  function executeShotPhysics(angle: number, shotPower: number, shooterId: string) {
    const balls = ballsRef.current;
    const cueBall = balls.find((b) => b.id === 0);
    if (!cueBall) return;

    setIsSimulating(true);
    play('bida_hit');

    // Punchy, realistic tournament shot force (was 16, now up to 36 px/tick)
    const force = 4 + (shotPower / 100) * 32;
    cueBall.vx = Math.cos(angle) * force;
    cueBall.vy = Math.sin(angle) * force;

    const pockets = createStandardPockets(DEFAULT_TABLE_BOUNDS);
    const pocketedThisShot: number[] = [];
    let scratch = false;
    let eightBallPocketed = false;

    const stepInterval = setInterval(() => {
      const res = stepBilliardsPhysics(balls, DEFAULT_TABLE_BOUNDS, pockets);

      if (res.ballCollisions.length > 0) {
        play('bida_hit');
      }
      if (res.cushionCollisions.length > 0) {
        play('bida_cushion');
      }
      if (res.pocketedThisStep.length > 0) {
        play('bida_pocket');
        for (const id of res.pocketedThisStep) {
          if (id === 0) scratch = true;
          else if (id === 8) eightBallPocketed = true;
          else pocketedThisShot.push(id);
        }
      }

      if (!res.anyMoving) {
        clearInterval(stepInterval);

        // Online Server handling
        if (
          net.isConnected() &&
          activeMatchRef.current &&
          !activeMatchRef.current.isAi &&
          !activeMatchRef.current.isLocal2P &&
          activeMatchRef.current.mode !== 'practice'
        ) {
          if (shooterId === net.room?.sessionId) {
            net.send('bida:shot_settled', {
              tableId: activeMatchRef.current?.id,
              pocketedBallIds: pocketedThisShot,
              scratch,
              eightBallPocketed,
              balls: balls.map((b) => ({ ...b })),
            });
          }
          return;
        }

        // Local / Standalone / Bot settlement
        const match = activeMatchRef.current;
        if (!match) return;

        if (scratch) {
          resetCueBallInKitchen(DEFAULT_TABLE_BOUNDS, balls);
          play('bida_cushion');
        }

        let nextScore1 = match.score1;
        let nextScore2 = match.score2;
        if (match.isLocal2P) {
          if (match.turn === 'p1') nextScore1 += pocketedThisShot.length;
          else nextScore2 += pocketedThisShot.length;
        } else {
          if (match.turn === 'me' || match.mode === 'practice') nextScore1 += pocketedThisShot.length;
          else nextScore2 += pocketedThisShot.length;
        }

        if (eightBallPocketed) {
          const remaining = balls.filter((b) => b.id > 0 && b.id !== 8 && !b.pocketed).length;
          let winnerName = '';
          let winnerId = '';
          let reason = '';

          if (remaining > 0 || scratch) {
            if (match.isLocal2P) {
              winnerId = match.turn === 'p1' ? 'p2' : 'p1';
              winnerName = match.turn === 'p1' ? 'Cơ Thủ 2' : 'Cơ Thủ 1';
              reason = `${match.turn === 'p1' ? 'Cơ Thủ 1' : 'Cơ Thủ 2'} làm rơi bi số 8 khi chưa dọn sạch bàn! ${winnerName} chiến thắng!`;
            } else {
              winnerId = match.turn === 'me' ? 'ai' : 'me';
              winnerName = match.turn === 'me' ? match.guestName || 'Đối thủ' : me.displayName;
              reason = `Làm rơi bi số 8 khi chưa dọn sạch bàn! ${winnerName} chiến thắng!`;
            }
          } else {
            if (match.isLocal2P) {
              winnerId = match.turn;
              winnerName = match.turn === 'p1' ? 'Cơ Thủ 1' : 'Cơ Thủ 2';
              reason = `${winnerName} xuất sắc dọn sạch bàn và đưa bi số 8 vào lỗ thành công!`;
            } else {
              winnerId = match.turn;
              winnerName = match.turn === 'me' ? me.displayName : match.guestName || 'Đối thủ';
              reason = `${winnerName} xuất sắc dọn sạch bàn và đưa bi số 8 vào lỗ thành công!`;
            }
          }

          setWinModal({ winnerId, winnerName, reason });
          setIsSimulating(false);
          play('bida_win');
          return;
        }

        let nextTurn = match.turn;
        if (match.mode === 'practice') {
          nextTurn = 'me';
        } else if (match.isLocal2P) {
          if (scratch || pocketedThisShot.length === 0) {
            nextTurn = match.turn === 'p1' ? 'p2' : 'p1';
          }
        } else if (match.isAi) {
          if (scratch || pocketedThisShot.length === 0) {
            nextTurn = match.turn === 'me' ? 'ai' : 'me';
          }
        }

        setActiveMatch({
          ...match,
          turn: nextTurn,
          score1: nextScore1,
          score2: nextScore2,
          balls: balls.map((b) => ({ ...b })),
        });
        setIsSimulating(false);
      }
    }, 16);
  }

  const drawTable = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bounds = DEFAULT_TABLE_BOUNDS;
    const w = canvas.width;
    const h = canvas.height;
    const balls = ballsRef.current;
    const pockets = createStandardPockets(bounds);

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#291809';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#451a03';
    ctx.fillRect(16, 16, w - 32, h - 32);

    ctx.fillStyle = '#fef08a';
    for (let d = 1; d <= 7; d++) {
      const dx = bounds.cushionLeft + ((bounds.cushionRight - bounds.cushionLeft) * d) / 8;
      ctx.beginPath();
      ctx.arc(dx, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dx, h - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let d = 1; d <= 3; d++) {
      const dy = bounds.cushionTop + ((bounds.cushionBottom - bounds.cushionTop) * d) / 4;
      ctx.beginPath();
      ctx.arc(8, dy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w - 8, dy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const isCarom = activeMatch?.mode === 'carom';
    ctx.fillStyle = isCarom ? '#1d4ed8' : '#047857';
    ctx.fillRect(
      bounds.cushionLeft,
      bounds.cushionTop,
      bounds.cushionRight - bounds.cushionLeft,
      bounds.cushionBottom - bounds.cushionTop,
    );

    ctx.strokeStyle = '#022c22';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      bounds.cushionLeft,
      bounds.cushionTop,
      bounds.cushionRight - bounds.cushionLeft,
      bounds.cushionBottom - bounds.cushionTop,
    );

    const kitchenX = bounds.cushionLeft + (bounds.cushionRight - bounds.cushionLeft) * 0.25;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(kitchenX, bounds.cushionTop);
    ctx.lineTo(kitchenX, bounds.cushionBottom);
    ctx.stroke();

    if (!isCarom) {
      for (const p of pockets) {
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    for (const b of balls) {
      if (b.pocketed) continue;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(b.x + 2, b.y + 3, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      if (b.id > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.font = '800 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.number), b.x, b.y + 0.5);
      }
    }

    const cueBall = balls.find((b) => b.id === 0);
    if (cueBall && !cueBall.pocketed && !isSimulating) {
      const pred = calculateAimPrediction(cueBall, balls, aimAngle, bounds);

      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(pred.cueBallCollisionPoint.x, pred.cueBallCollisionPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pred.cueBallCollisionPoint.x, pred.cueBallCollisionPoint.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      if (pred.targetBallDirection) {
        const tx = pred.cueBallCollisionPoint.x;
        const ty = pred.cueBallCollisionPoint.y;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + pred.targetBallDirection.x * 45, ty + pred.targetBallDirection.y * 45);
        ctx.stroke();
      }

      const cueDist = 18 + (power / 100) * 55;
      const cueStartX = cueBall.x - Math.cos(aimAngle) * cueDist;
      const cueStartY = cueBall.y - Math.sin(aimAngle) * cueDist;
      const cueLength = 160;
      const cueEndX = cueStartX - Math.cos(aimAngle) * cueLength;
      const cueEndY = cueStartY - Math.sin(aimAngle) * cueLength;

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cueStartX, cueStartY);
      ctx.lineTo(cueEndX, cueEndY);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cueStartX, cueStartY);
      ctx.lineTo(cueStartX - Math.cos(aimAngle) * 4, cueStartY - Math.sin(aimAngle) * 4);
      ctx.stroke();

      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cueEndX + Math.cos(aimAngle) * 45, cueEndY + Math.sin(aimAngle) * 45);
      ctx.lineTo(cueEndX, cueEndY);
      ctx.stroke();
    }
  }, [activeMatch, aimAngle, power, isSimulating]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeMatch || !isMyTurn || isSimulating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall) return;

    const angle = Math.atan2(my - cueBall.y, mx - cueBall.x);
    setAimAngle(angle);

    if (net.isConnected() && !activeMatch.isAi && !activeMatch.isLocal2P) {
      net.send('bida:aim', { tableId: activeMatch.id, angle });
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!activeMatch || !isMyTurn || isSimulating) return;
    e.preventDefault();
    setPower((p) => {
      const delta = e.deltaY < 0 ? 5 : -5;
      return Math.min(100, Math.max(10, p + delta));
    });
  };

  const handleStartSolo = () => {
    play('click');
    const match: ActiveMatch = {
      id: `solo_${Date.now()}`,
      name: `Luyện Tập (${me.displayName})`,
      mode: 'practice',
      hostId: 'me',
      hostName: me.displayName,
      status: 'playing',
      turn: 'me',
      score1: 0,
      score2: 0,
      balls: createStandard8BallRack(),
    };
    ballsRef.current = match.balls;
    setActiveMatch(match);
    setWinModal(null);
  };

  const handleCreateRoom = () => {
    play('click');
    setCreating(false);

    if (tableType === 'online' && net.isConnected()) {
      net.send('bida:create_table', {
        name: tableName,
        mode: '8ball',
      });
      return;
    }

    const is2P = tableType === '8ball_2p';
    const isAi = tableType === '8ball_ai' || tableType === 'carom_ai';
    const isCarom = tableType === 'carom_ai';
    const isPractice = tableType === 'practice';

    const match: ActiveMatch = {
      id: `match_${Date.now()}`,
      name: tableName,
      mode: isCarom ? 'carom' : isPractice ? 'practice' : '8ball',
      hostId: 'me',
      hostName: is2P ? 'Cơ Thủ 1' : me.displayName,
      guestId: is2P ? 'p2' : isAi ? 'ai' : undefined,
      guestName: is2P ? 'Cơ Thủ 2' : isCarom ? 'Trọng Tài Huy' : isAi ? 'Minh Long (Hạng A)' : undefined,
      status: 'playing',
      turn: is2P ? 'p1' : 'me',
      score1: 0,
      score2: 0,
      balls: isCarom ? createCaromRack() : createStandard8BallRack(),
      isAi,
      isLocal2P: is2P,
    };

    ballsRef.current = match.balls;
    setActiveMatch(match);
    setWinModal(null);
  };

  const handleJoinTable = (tbl: TableSummary) => {
    play('click');

    if (tbl.isAi || tbl.isLocal2P || !net.isConnected()) {
      const isCarom = tbl.mode === 'carom';
      const match: ActiveMatch = {
        id: `match_${Date.now()}`,
        name: tbl.name,
        mode: tbl.mode,
        hostId: tbl.isLocal2P ? 'p1' : 'me',
        hostName: tbl.isLocal2P ? 'Cơ Thủ 1' : me.displayName,
        guestId: tbl.isLocal2P ? 'p2' : 'ai',
        guestName: tbl.isLocal2P ? 'Cơ Thủ 2' : tbl.hostName,
        status: 'playing',
        turn: tbl.isLocal2P ? 'p1' : 'me',
        score1: 0,
        score2: 0,
        balls: isCarom ? createCaromRack() : createStandard8BallRack(),
        isAi: tbl.isAi ?? false,
        isLocal2P: tbl.isLocal2P ?? false,
      };

      ballsRef.current = match.balls;
      setActiveMatch(match);
      setWinModal(null);
      return;
    }

    net.send('bida:join_table', { tableId: tbl.id });
  };

  const handleRematch = () => {
    if (!activeMatch) return;
    play('click');

    if (activeMatch.isAi || activeMatch.isLocal2P || !net.isConnected()) {
      const isCarom = activeMatch.mode === 'carom';
      const newBalls = isCarom ? createCaromRack() : createStandard8BallRack();
      ballsRef.current = newBalls;
      setActiveMatch({
        ...activeMatch,
        balls: newBalls,
        status: 'playing',
        score1: 0,
        score2: 0,
        turn: activeMatch.isLocal2P ? 'p1' : 'me',
        winner: undefined,
        winnerName: undefined,
      });
      setWinModal(null);
      return;
    }

    net.send('bida:rematch', { tableId: activeMatch.id });
  };

  const handleLeaveTable = () => {
    if (!activeMatch) return;
    play('click');
    if (net.isConnected() && !activeMatch.isAi && !activeMatch.isLocal2P) {
      net.send('bida:leave_table', { tableId: activeMatch.id });
    }
    setActiveMatch(null);
    setWinModal(null);
    net.send('bida:get_tables', {});
  };

  return (
    <div className="backdrop" role="dialog" aria-modal="true" aria-label="CLB Bida H2S Biên Hòa">
      <div className="modal bida-modal" style={{ maxWidth: 860, width: '95vw', padding: 0 }}>
        <div
          className="modal-header"
          style={{ padding: '12px 20px', background: '#09090b', borderBottom: '1px solid #27272a' }}
        >
          <div className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 22 }}>🎱</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#facc15', fontWeight: 800 }}>
                CLB BIDA H2S · BIÊN HÒA
              </h2>
              <span className="muted" style={{ fontSize: 12 }}>
                Trảng Dài · Bàn thi đấu chuẩn Tournament · Phòng lạnh 100%
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng (Esc)">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {!activeMatch ? (
            <div>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Danh Sách Bàn Thi Đấu</h3>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Chọn bàn để giao lưu 1v1 hoặc tự tạo phòng thách đấu
                  </span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button variant="secondary" onClick={handleStartSolo}>
                    <Play size={15} /> Luyện Tập Solo
                  </Button>
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    + Tạo Bàn Mới
                  </Button>
                </div>
              </div>

              {creating ? (
                <div
                  style={{
                    background: '#18181b',
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid #3f3f46',
                    marginBottom: 16,
                  }}
                >
                  <h4 style={{ margin: '0 0 12px', color: '#facc15' }}>Thiết Lập Bàn Bida Mới</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tên bàn đấu:</label>
                      <input
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                        maxLength={35}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Thể loại & Chế độ thi đấu:
                      </label>
                      <select
                        value={tableType}
                        onChange={(e) => setTableType(e.target.value as typeof tableType)}
                        className="input"
                        style={{ width: '100%' }}
                      >
                        <option value="8ball_2p">👥 8-Ball Pool (Đấu 2 Người Cùng Máy / Pass & Play)</option>
                        <option value="8ball_ai">🤖 8-Ball Pool (Đấu Với AI Minh Long Hạng A)</option>
                        <option value="carom_ai">🔴 Carom 3 Băng (Đấu Với Trọng Tài Huy)</option>
                        <option value="practice">🎯 Luyện Tập Tự Do (Solo Practice)</option>
                        <option value="online">🌐 8-Ball Pool Online (Chờ Người Chơi Khác)</option>
                      </select>
                    </div>
                  </div>
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                    <Button variant="secondary" onClick={() => setCreating(false)}>
                      Hủy
                    </Button>
                    <Button variant="primary" onClick={handleCreateRoom}>
                      Bắt Đầu Trận Đấu
                    </Button>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: 12,
                }}
              >
                {tables.map((tbl) => {
                  const isWaiting = tbl.status === 'waiting';
                  return (
                    <div
                      key={tbl.id}
                      style={{
                        background: '#18181b',
                        borderRadius: 8,
                        padding: 14,
                        border: isWaiting ? '1px solid #10b981' : '1px solid #27272a',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>{tbl.name}</span>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: tbl.isLocal2P
                                ? 'rgba(59, 130, 246, 0.2)'
                                : tbl.isAi
                                  ? 'rgba(168, 85, 247, 0.2)'
                                  : isWaiting
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(234, 179, 8, 0.2)',
                              color: tbl.isLocal2P
                                ? '#60a5fa'
                                : tbl.isAi
                                  ? '#c084fc'
                                  : isWaiting
                                    ? '#34d399'
                                    : '#facc15',
                              fontWeight: 600,
                            }}
                          >
                            {tbl.isLocal2P
                              ? 'Đấu 2 Người'
                              : tbl.isAi
                                ? 'Thách Đấu (AI)'
                                : isWaiting
                                  ? 'Chờ đối thủ (1/2)'
                                  : 'Đang thi đấu (2/2)'}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                          Thể loại:{' '}
                          <strong>
                            {tbl.mode === '8ball'
                              ? '8-Ball Pool'
                              : tbl.mode === 'carom'
                                ? 'Carom 3 Băng'
                                : 'Tập luyện'}
                          </strong>
                          <br />
                          Chủ bàn: <strong>{tbl.hostName}</strong>
                          {tbl.guestName ? (
                            <>
                              {' '}
                              vs <strong>{tbl.guestName}</strong>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                        <Button variant="primary" size="sm" onClick={() => handleJoinTable(tbl)}>
                          <Play size={13} /> Vào Bàn Đấu
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  background: '#18181b',
                  padding: '10px 16px',
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid #27272a',
                }}
              >
                <div className="row" style={{ gap: 16 }}>
                  <Button variant="secondary" size="sm" onClick={handleLeaveTable}>
                    <ChevronLeft size={15} /> Rời Bàn
                  </Button>
                  <div>
                    <strong style={{ fontSize: 15, color: '#facc15' }}>{activeMatch.name}</strong>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                      (
                      {activeMatch.mode === '8ball'
                        ? '8-Ball Pool'
                        : activeMatch.mode === 'carom'
                          ? 'Carom 3 Băng'
                          : 'Tập luyện'}
                      )
                    </span>
                  </div>
                </div>

                <div className="row" style={{ gap: 20 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>{activeMatch.hostName}:</span>
                    <span style={{ fontSize: 18, fontWeight: 900 }}>{activeMatch.score1}</span>
                  </div>
                  <span style={{ color: '#71717a' }}>VS</span>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 700, color: '#f43f5e' }}>
                      {activeMatch.guestName ?? 'Chờ khách…'}:
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 900 }}>{activeMatch.score2}</span>
                  </div>
                </div>

                <Button variant="secondary" size="sm" onClick={handleRematch} title="Xếp lại bi / Đấu lại">
                  <RefreshCw size={14} /> Xếp Lại Bi
                </Button>
              </div>

              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  marginBottom: 10,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  background: activeMatch.isLocal2P
                    ? activeMatch.turn === 'p1'
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(59, 130, 246, 0.25)'
                    : isMyTurn
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(234, 179, 8, 0.25)',
                  color: activeMatch.isLocal2P
                    ? activeMatch.turn === 'p1'
                      ? '#34d399'
                      : '#60a5fa'
                    : isMyTurn
                      ? '#34d399'
                      : '#facc15',
                  border: '1px solid currentColor',
                }}
              >
                {activeMatch.isLocal2P
                  ? activeMatch.turn === 'p1'
                    ? '🟢 LƯỢT CỦA CƠ THỦ 1 (Cầm cơ) — Rê chuột ngắm bi, giữ Space để đánh!'
                    : '🔵 LƯỢT CỦA CƠ THỦ 2 (Cầm cơ) — Rê chuột ngắm bi, giữ Space để đánh!'
                  : activeMatch.isAi && activeMatch.turn === 'ai'
                    ? '🤖 ĐỐI THỦ ĐANG TÍNH TOÁN ĐƯỜNG CƠ (Vui lòng đợi)...'
                    : isMyTurn
                      ? '👉 LƯỢT CỦA BẠN (CẦM CƠ) — Rê chuột ngắm bi, kéo chuột hoặc giữ Space để nạp lực đánh!'
                      : '⏳ ĐANG CHỜ ĐỐI THỦ ĐÁNH...'}
              </div>

              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <canvas
                  ref={canvasRef}
                  width={DEFAULT_TABLE_BOUNDS.width}
                  height={DEFAULT_TABLE_BOUNDS.height}
                  onMouseMove={handleCanvasMouseMove}
                  onWheel={handleCanvasWheel}
                  onMouseDown={() => {
                    if (isMyTurn && !isSimulating) setIsCharging(true);
                  }}
                  onMouseUp={() => {
                    if (isCharging) {
                      setIsCharging(false);
                      triggerShot();
                    }
                  }}
                  style={{
                    borderRadius: 8,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
                    cursor: isMyTurn ? 'crosshair' : 'default',
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />

                {isMyTurn && !isSimulating ? (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(9, 9, 11, 0.94)',
                      padding: '8px 18px',
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid #3f3f46',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#facc15', minWidth: 80 }}>
                        ⚡ Lực: {power}%
                      </span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={1}
                        value={power}
                        onChange={(e) => setPower(Number(e.target.value))}
                        disabled={isSimulating}
                        style={{
                          width: 130,
                          cursor: 'pointer',
                          accentColor: power > 75 ? '#ef4444' : power > 45 ? '#eab308' : '#22c55e',
                        }}
                        title="Kéo thanh trượt để chỉnh lực đánh"
                      />
                      <Button
                        variant="reward"
                        size="sm"
                        onClick={() => triggerShot()}
                        disabled={isSimulating}
                        style={{ padding: '5px 14px', fontWeight: 800 }}
                      >
                        <Zap size={14} /> Đánh Cơ (Space)
                      </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ color: '#a1a1aa' }}>Chọn nhanh:</span>
                      {[
                        { label: 'Gõ Nhẹ', val: 25 },
                        { label: 'Vừa', val: 55 },
                        { label: 'Mạnh', val: 80 },
                        { label: 'Max Phá Bi', val: 100 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setPower(preset.val)}
                          disabled={isSimulating}
                          style={{
                            background: power === preset.val ? '#3f3f46' : '#18181b',
                            border: `1px solid ${power === preset.val ? '#facc15' : '#27272a'}`,
                            color: power === preset.val ? '#facc15' : '#d4d4d8',
                            borderRadius: 4,
                            padding: '1px 7px',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {preset.label} ({preset.val}%)
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  marginTop: 12,
                  fontSize: 12,
                  color: '#a1a1aa',
                }}
              >
                <span>
                  💡 <strong>Cách chỉnh lực:</strong> Kéo thanh trượt, chọn nhanh hoặc lăn chuột · Giữ{' '}
                  <strong>Space</strong> để nạp lực mượt mà · <strong>A / D</strong> tinh chỉnh góc ngắm
                </span>
                <span>🏆 CLB Bida H2S Trảng Dài · TP. Biên Hòa</span>
              </div>
            </div>
          )}
        </div>

        {winModal ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: '#18181b',
                padding: 28,
                borderRadius: 12,
                border: '2px solid #facc15',
                textAlign: 'center',
                maxWidth: 420,
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>🏆</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 22, color: '#facc15', fontWeight: 900 }}>
                {winModal.winnerId === net.room?.sessionId
                  ? 'BẠN ĐÃ CHIẾN THẮNG!'
                  : `${winModal.winnerName} THẮNG TRẬN!`}
              </h3>
              <p style={{ color: '#d4d4d8', fontSize: 14, margin: '0 0 16px' }}>{winModal.reason}</p>
              {winModal.winnerId === net.room?.sessionId ? (
                <div
                  className="row"
                  style={{
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 20,
                    color: '#facc15',
                    fontWeight: 700,
                  }}
                >
                  <CoinIcon size={20} /> +50 Xu Cơ Thủ Biên Hòa
                </div>
              ) : null}
              <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
                <Button variant="secondary" onClick={handleLeaveTable}>
                  Rời Bàn
                </Button>
                <Button variant="primary" onClick={handleRematch}>
                  <RefreshCw size={15} /> Đấu Lại Ván Mới
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

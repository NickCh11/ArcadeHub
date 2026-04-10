'use client';

import { useEffect, useRef, useState } from 'react';
import { useBilliards } from './BilliardsContext';

// ─── Constants ───────────────────────────────────────────────────────────────
const PI2 = Math.PI * 2;
const TABLE_SCALE = 3.6;
const K = 0.9 * TABLE_SCALE;
const FRICTION = 0.3 * TABLE_SCALE;
const VEL_SCALE = (22 / 3.8) * TABLE_SCALE;
const BALL_SIZE = 3.3 * TABLE_SCALE;
const CANVAS_W = 262 * TABLE_SCALE;
const CANVAS_H = 150 * TABLE_SCALE;
const TABLE_SPACING = 19 * TABLE_SCALE;

const tableCorner = {
  left: TABLE_SPACING,
  right: CANVAS_W - TABLE_SPACING,
  top: TABLE_SPACING,
  bottom: CANVAS_H - TABLE_SPACING,
};

// ─── Physics Classes ─────────────────────────────────────────────────────────

interface BallData {
  x: number;
  y: number;
  eight: boolean;
  color: string;
  onTable: boolean;
  vel: number;
  orientation: number;
  white?: boolean;
}

class Ball {
  x: number;
  y: number;
  r: number;
  mass: number;
  eight: boolean;
  white: boolean;
  onTable: boolean;
  vel: number;
  orientation: number;
  color: string;
  dx: number = 0;
  dy: number = 0;

  constructor(x: number, y: number, eight = false, blue = true) {
    this.x = x;
    this.y = y;
    this.r = BALL_SIZE;
    this.mass = 0.5;
    this.eight = eight;
    this.white = false;
    this.onTable = true;
    this.vel = 0;
    this.orientation = 0;
    this.color = blue ? 'blue' : 'red';
  }

  move() {
    this.dx = this.vel * Math.cos(this.orientation);
    this.dy = this.vel * Math.sin(this.orientation);
    this.x += this.dx;
    this.y += this.dy;
    this.vel -= FRICTION / VEL_SCALE;
    if (this.vel < 0) this.vel = 0;
  }

  update(balls: Ball[]) {
    if (!this.onTable) return;
    this.move();
    this.ballCollision(balls);
    this.wallCollision();
    if (this.holeCollision() && this.onTable) {
      this.inHole();
    }
  }

  ballCollision(balls: Ball[]) {
    for (const ball of balls) {
      if (!ball.onTable || ball === this) continue;
      if (Math.hypot(this.x - ball.x, this.y - ball.y) < ball.r + this.r) {
        const oriVel = this.vel;
        const oriOrientation = this.orientation;

        const contactAngle = Math.atan2(ball.y - this.y, ball.x - this.x);
        const tangentLineAngle = contactAngle - Math.PI;

        this.orientation = tangentLineAngle;

        const myNewVelX =
          (Math.cos(contactAngle) *
            (2 * ball.mass * ball.vel * Math.cos(ball.orientation - contactAngle))) /
            (this.mass + ball.mass) +
          oriVel *
            Math.sin(oriOrientation - contactAngle) *
            Math.cos(contactAngle + Math.PI / 2);
        const myNewVelY =
          (Math.sin(contactAngle) *
            (2 * ball.mass * ball.vel * Math.cos(ball.orientation - contactAngle))) /
            (this.mass + ball.mass) +
          oriVel *
            Math.sin(oriOrientation - contactAngle) *
            Math.sin(contactAngle + Math.PI / 2);

        this.vel = Math.hypot(myNewVelX, myNewVelY);
        this.x -= this.dx;
        this.y -= this.dy;

        ball.orientation = contactAngle;
        const contactAngle2 = Math.atan2(this.y - ball.y, this.x - ball.x);

        const otherVelX =
          (Math.cos(contactAngle2) *
            (2 * this.mass * oriVel * Math.cos(oriOrientation - contactAngle2))) /
            (this.mass + ball.mass) +
          this.vel *
            Math.sin(ball.orientation - contactAngle2) *
            Math.cos(contactAngle2 + Math.PI / 2);
        const otherVelY =
          (Math.sin(contactAngle2) *
            (2 * this.mass * oriVel * Math.cos(oriOrientation - contactAngle2))) /
            (this.mass + ball.mass) +
          this.vel *
            Math.sin(ball.orientation - contactAngle2) *
            Math.sin(contactAngle2 + Math.PI / 2);

        ball.vel = Math.hypot(otherVelX, otherVelY);
        this.vel = Math.round(this.vel * 1000) / 1000;
      }
    }
  }

  wallCollision() {
    if (this.y - this.r <= tableCorner.top || this.y + this.r >= tableCorner.bottom) {
      this.orientation = Math.atan2(-this.dy, this.dx);
    }
    if (this.x - this.r <= tableCorner.left || this.x + this.r >= tableCorner.right) {
      this.orientation = Math.atan2(this.dy, -this.dx);
    }
    if (this.y - this.r <= tableCorner.top) this.y = tableCorner.top + this.r;
    else if (this.y + this.r >= tableCorner.bottom) this.y = tableCorner.bottom - this.r;
    if (this.x - this.r <= tableCorner.left) this.x = tableCorner.left + this.r;
    else if (this.x + this.r >= tableCorner.right) this.x = tableCorner.right - this.r;
  }

  holeCollision(): boolean {
    return HOLES.some(
      (hole) => Math.hypot(hole.x - this.x, hole.y - this.y) < (hole.r + this.r) * 0.95
    );
  }

  inHole() {
    this.onTable = false;
    this.vel = 0;
  }

  draw(c: CanvasRenderingContext2D) {
    if (!this.onTable) return;
    if (this.eight) {
      c.fillStyle = 'black';
      c.beginPath();
      c.arc(this.x, this.y, this.r, 0, PI2);
      c.fill();
      c.fillStyle = 'white';
      c.beginPath();
      c.arc(this.x, this.y, this.r / 2, 0, PI2);
      c.fill();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = 'black';
      c.fillText('8', this.x, this.y);
    } else {
      c.fillStyle = this.color;
      c.beginPath();
      c.arc(this.x, this.y, this.r, 0, PI2);
      c.fill();
    }
  }
}

class WhiteBall extends Ball {
  constructor(x: number, y: number) {
    super(x, y);
    this.white = true;
  }

  draw(c: CanvasRenderingContext2D) {
    if (!this.onTable) return;
    c.fillStyle = 'white';
    c.beginPath();
    c.arc(this.x, this.y, this.r, 0, PI2);
    c.fill();
  }

  setStart() {
    this.onTable = true;
    this.vel = 0;
    this.x = CANVAS_W * 0.25;
    this.y = CANVAS_H * 0.5;
  }
}

interface HoleType {
  x: number;
  y: number;
  r: number;
}

const HOLES: HoleType[] = [
  { x: TABLE_SPACING * 0.95, y: TABLE_SPACING * 0.95, r: 6.35 * TABLE_SCALE },
  { x: CANVAS_W / 2, y: TABLE_SPACING * 0.79, r: 6.35 * TABLE_SCALE },
  { x: CANVAS_W - TABLE_SPACING * 0.95, y: TABLE_SPACING * 0.95, r: 6.35 * TABLE_SCALE },
  { x: TABLE_SPACING * 0.95, y: CANVAS_H - TABLE_SPACING * 0.95, r: 6.35 * TABLE_SCALE },
  { x: CANVAS_W / 2, y: CANVAS_H - TABLE_SPACING * 0.79, r: 6.35 * TABLE_SCALE },
  { x: CANVAS_W - TABLE_SPACING * 0.95, y: CANVAS_H - TABLE_SPACING * 0.95, r: 6.35 * TABLE_SCALE },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawTableSpacing(c: CanvasRenderingContext2D) {
  c.fillStyle = '#964B00';
  c.fillRect(0, 0, CANVAS_W, TABLE_SPACING);
  c.fillRect(0, tableCorner.bottom, CANVAS_W, TABLE_SPACING);
  c.fillRect(0, 0, TABLE_SPACING, CANVAS_H);
  c.fillRect(tableCorner.right, 0, TABLE_SPACING, CANVAS_H);
}

function drawHoles(c: CanvasRenderingContext2D) {
  for (const hole of HOLES) {
    c.fillStyle = 'black';
    c.beginPath();
    c.arc(hole.x, hole.y, hole.r, 0, PI2);
    c.fill();
  }
}

function calculateVel(mouseData: { x: number; y: number }, balls: Ball[]) {
  let distance = Math.hypot(mouseData.x - balls[0].x, mouseData.y - balls[0].y) - BALL_SIZE;
  const max = CANVAS_H * 0.2;
  if (distance > max) distance = max;
  if (distance < 0) distance = 0;
  return distance * K;
}

function drawLaunchAnimation(
  c: CanvasRenderingContext2D,
  mouseData: { x: number; y: number; isLaunching: boolean },
  balls: Ball[]
) {
  if (!mouseData.isLaunching) return;
  const lineLength = calculateVel(mouseData, balls);
  c.lineWidth = 5 + lineLength / 50;
  c.strokeStyle = 'white';
  c.globalAlpha = 0.75;
  const ballX = balls[0].x;
  const ballY = balls[0].y;
  const angle = Math.atan2(mouseData.y - ballY, mouseData.x - ballX) + Math.PI;
  c.beginPath();
  c.moveTo(ballX, ballY);
  c.lineTo(lineLength * Math.cos(angle) + ballX, lineLength * Math.sin(angle) + ballY);
  c.stroke();
  c.lineWidth = 1;
  c.globalAlpha = 1;
}

function setBalls(): Ball[] {
  const b: Ball[] = [];
  const w = new WhiteBall(300, 300);
  w.setStart();
  b.push(w);

  b.push(new Ball(CANVAS_W * 0.55, CANVAS_H * 0.5, false, false));
  b.push(new Ball(CANVAS_W * 0.58, CANVAS_H * 0.47, false, false));
  b.push(new Ball(CANVAS_W * 0.58, CANVAS_H * 0.53, false, true));
  b.push(new Ball(CANVAS_W * 0.61, CANVAS_H * 0.44, false, true));
  b.push(new Ball(CANVAS_W * 0.61, CANVAS_H * 0.5, true, false)); // Eight
  b.push(new Ball(CANVAS_W * 0.61, CANVAS_H * 0.56, false, false));
  b.push(new Ball(CANVAS_W * 0.64, CANVAS_H * 0.41, false, false));
  b.push(new Ball(CANVAS_W * 0.64, CANVAS_H * 0.47, false, true));
  b.push(new Ball(CANVAS_W * 0.64, CANVAS_H * 0.53, false, true));
  b.push(new Ball(CANVAS_W * 0.64, CANVAS_H * 0.59, false, false));
  b.push(new Ball(CANVAS_W * 0.67, CANVAS_H * 0.38, false, false));
  b.push(new Ball(CANVAS_W * 0.67, CANVAS_H * 0.44, false, true));
  b.push(new Ball(CANVAS_W * 0.67, CANVAS_H * 0.5, false, false));
  b.push(new Ball(CANVAS_W * 0.67, CANVAS_H * 0.56, false, true));
  b.push(new Ball(CANVAS_W * 0.67, CANVAS_H * 0.62, false, true));
  return b;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BilliardsGame() {
  const { socket, myRole } = useBilliards();
  const [instruction, setInstruction] = useState(
    myRole === 'player1' ? 'YOUR TURN' : "OPPONENT'S TURN..."
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafIdRef = useRef<number>(0);
  const socketRef = useRef(socket);

  // Keep socketRef in sync with context socket
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Game state — all mutable refs, never React state
  const ballsRef = useRef<Ball[]>([]);
  const myTurnRef = useRef(myRole === 'player1');
  const startGameRef = useRef(true); // already started when this component mounts
  const eventualTurnSwitchRef = useRef(false);
  const profileRef = useRef({
    playerType: myRole ?? '',
    id: socket?.id ?? '',
  });
  const ballCountRef = useRef({ red: 7, blue: 7, eight: 1 });
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false, isLaunching: false });
  const receivedMouseRef = useRef({ x: 0, y: 0, isLaunching: false });

  const setInstructionRef = useRef(setInstruction);
  setInstructionRef.current = setInstruction;

  // ── Canvas + physics setup (runs once on mount) ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctxRef.current = canvas.getContext('2d');

    ballsRef.current = setBalls();

    // Update profileRef with current socket id
    if (socketRef.current?.id) {
      profileRef.current.id = socketRef.current.id;
    }

    const onMouseDown = () => {
      mouseRef.current.isPressed = true;
      const mouse = mouseRef.current;
      const balls = ballsRef.current;
      if (
        myTurnRef.current &&
        balls.length > 0 &&
        Math.hypot(mouse.x - balls[0].x, mouse.y - balls[0].y) < BALL_SIZE
      ) {
        mouseRef.current.isLaunching = true;
      }
    };

    const onMouseUp = () => {
      mouseRef.current.isPressed = false;
      const mouse = mouseRef.current;
      const balls = ballsRef.current;
      const socket = socketRef.current;

      if (
        mouse.isLaunching &&
        balls.length > 0 &&
        Math.hypot(mouse.x - balls[0].x, mouse.y - balls[0].y) > BALL_SIZE
      ) {
        balls[0].vel = calculateVel(mouse, balls) / VEL_SCALE;
        balls[0].orientation =
          Math.atan2(mouse.y - balls[0].y, mouse.x - balls[0].x) + Math.PI;

        socket?.emit('launchBall', { ...mouse }, { ...profileRef.current });
        myTurnRef.current = false;
        eventualTurnSwitchRef.current = true;
      }

      mouseRef.current.isLaunching = false;
      socket?.emit('launching', { ...mouseRef.current }, { ...profileRef.current });
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / (rect.right - rect.left)) * canvas.width;
      mouseRef.current.y = ((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);

    function countBalls() {
      const countable = ballsRef.current.filter((b) => b.onTable && !b.white);
      return {
        blue: countable.filter((b) => !b.eight && b.color === 'blue').length,
        red: countable.filter((b) => !b.eight && b.color === 'red').length,
        eight: countable.filter((b) => b.eight).length,
      };
    }

    function otherBallsMoving() {
      return ballsRef.current.some((b) => b.vel !== 0);
    }

    function respawn() {
      const balls = ballsRef.current;
      if (balls.length > 0 && !balls[0].onTable && !otherBallsMoving()) {
        (balls[0] as WhiteBall).setStart?.();
      }
    }

    function sendLaunchAnimation() {
      if (myTurnRef.current) {
        socketRef.current?.emit('launching', { ...mouseRef.current }, { ...profileRef.current });
      }
    }

    function endOfTurn() {
      if (!eventualTurnSwitchRef.current) return;
      const allStopped = ballsRef.current.every((b) => Math.round(b.vel * 1000) === 0);
      if (!allStopped) return;

      const socket = socketRef.current;
      const profile = profileRef.current;
      const playerColor: Record<string, 'blue' | 'red'> = { player1: 'blue', player2: 'red' };
      const opponent: Record<string, string> = { player1: 'player2', player2: 'player1' };

      socket?.emit('updateBalls', ballsRef.current, opponent[profile.playerType]);
      socket?.emit('updateBalls', ballsRef.current, 'spectator');

      const counted = countBalls();
      const myColor = playerColor[profile.playerType];

      if (counted.eight === 0) {
        if (counted[myColor] === 0) {
          socket?.emit('opponentLoss', profile);
          setInstructionRef.current('YOU WIN');
        } else {
          socket?.emit('opponentWin', profile);
          setInstructionRef.current('YOU LOST');
        }
        profileRef.current.playerType = 'spectator';
        eventualTurnSwitchRef.current = false;
        return;
      }

      if (counted[myColor] < ballCountRef.current[myColor as keyof typeof ballCountRef.current]) {
        setInstructionRef.current('YOUR TURN AGAIN');
        myTurnRef.current = true;
      } else {
        socket?.emit('switchTurns', profile);
        setInstructionRef.current("OPPONENT'S TURN...");
      }

      ballCountRef.current = counted;
      eventualTurnSwitchRef.current = false;
    }

    function draw() {
      rafIdRef.current = requestAnimationFrame(draw);
      const c = ctxRef.current;
      if (!c) return;

      c.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawTableSpacing(c);
      drawHoles(c);

      const balls = ballsRef.current;
      for (const ball of balls) {
        ball.draw(c);
        ball.update(balls);
      }

      respawn();
      drawLaunchAnimation(c, mouseRef.current, balls);
      if (!myTurnRef.current) {
        drawLaunchAnimation(c, receivedMouseRef.current, balls);
      }

      sendLaunchAnimation();
      endOfTurn();
    }

    draw();

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket event listeners (re-wires when socket changes) ────────────────
  useEffect(() => {
    if (!socket) return;

    // Keep profile id in sync
    if (socket.id) profileRef.current.id = socket.id;

    socket.on('forfeit', ({ forfeitingUserId, reason }: { forfeitingUserId?: string; reason?: string }) => {
      if (forfeitingUserId && socket.id === forfeitingUserId) {
        setInstructionRef.current('YOU LOST');
        return;
      }

      setInstructionRef.current(
        reason === 'manual_end' ? 'OPPONENT ENDED THE GAME' : 'OPPONENT DISCONNECTED'
      );
    });

    socket.on('opponentLaunching', (mouseData: typeof mouseRef.current, playerProfile: typeof profileRef.current) => {
      if (playerProfile.id === profileRef.current.id) return;
      receivedMouseRef.current = mouseData;
    });

    socket.on('launchedBall', (mouseData: typeof mouseRef.current, playerProfile: typeof profileRef.current) => {
      if (playerProfile.id === profileRef.current.id) return;
      const balls = ballsRef.current;
      if (balls.length === 0) return;
      balls[0].vel = calculateVel(mouseData, balls) / VEL_SCALE;
      balls[0].orientation =
        Math.atan2(mouseData.y - balls[0].y, mouseData.x - balls[0].x) + Math.PI;
    });

    socket.on('turnSwitch', (profileSent: typeof profileRef.current) => {
      if (profileRef.current.id === profileSent.id || profileRef.current.playerType === 'spectator') return;
      myTurnRef.current = true;
      setInstructionRef.current('YOUR TURN');
    });

    socket.on('youWin', (profileSent: typeof profileRef.current) => {
      if (profileRef.current.playerType === 'spectator') {
        setInstructionRef.current('A PLAYER WON');
      } else if (profileSent.id !== profileRef.current.id) {
        setInstructionRef.current('YOU WIN');
        profileRef.current.playerType = 'spectator';
      }
    });

    socket.on('youLoose', (profileSent: typeof profileRef.current) => {
      if (profileRef.current.playerType === 'spectator') {
        setInstructionRef.current('A PLAYER WON');
      } else if (profileSent.id !== profileRef.current.id) {
        setInstructionRef.current('YOU LOST');
        profileRef.current.playerType = 'spectator';
      }
    });

    socket.on('requestBoard', () => {
      if (profileRef.current.playerType !== 'player1') return;
      socket.emit('currentGameSent', ballsRef.current);
    });

    socket.on('ballData', (ballData: BallData[], playerType: string) => {
      if (profileRef.current.playerType !== playerType) return;
      const result: Ball[] = [];
      const wb = new WhiteBall(ballData[0].x, ballData[0].y);
      wb.onTable = ballData[0].onTable;
      wb.vel = ballData[0].vel;
      wb.orientation = ballData[0].orientation;
      result.push(wb);
      for (let i = 1; i < ballData.length; i++) {
        const b = new Ball(ballData[i].x, ballData[i].y, ballData[i].eight, ballData[i].color === 'blue');
        b.onTable = ballData[i].onTable;
        b.vel = ballData[i].vel;
        b.orientation = ballData[i].orientation;
        result.push(b);
      }
      ballsRef.current = result;
    });

    return () => {
      socket.off('forfeit');
      socket.off('opponentLaunching');
      socket.off('launchedBall');
      socket.off('turnSwitch');
      socket.off('youWin');
      socket.off('youLoose');
      socket.off('requestBoard');
      socket.off('ballData');
    };
  }, [socket]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', background: '#22c55e', cursor: 'crosshair' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '6%',
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '0.12em',
            color: '#fff',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {instruction}
        </span>
      </div>
    </div>
  );
}

import type { PageSide } from '#lib/catalog/reading.ts';
import {
	commitLeafTurn,
	releaseLeafTurn,
	setLeafTurnProgress,
	swipeNavigation,
	type LeafTurn,
	type TurnDirection
} from '#lib/physics/leaf-turn.ts';

export const READING_SWIPE_CONFIG = {
	tapDragThresholdPx: 6,
	outerMarginUvThreshold: 0.7,
	panCommitThresholdPx: 24,
	panFlickVelocityThreshold: 1.2,
	portraitTravelRatio: 0.85,
	desktopTravelRatio: 1.4,
	maxSwipeVelocity: 4,
	velocityStaleMs: 100
} as const;

export function isWithinTapThreshold(dx: number, dy: number): boolean {
	return Math.hypot(dx, dy) < READING_SWIPE_CONFIG.tapDragThresholdPx;
}

export interface PageHit {
	readonly side: PageSide;
	readonly outerMargin: boolean;
	readonly width: number;
}

export interface ReadingSwipeOptions {
	readonly hit: PageHit;
	readonly portrait: boolean;
	readonly focusedSide: PageSide;
	readonly startX: number;
	readonly startY: number;
	readonly startTime: number;
	readonly beginTurn: (direction: TurnDirection) => LeafTurn | null;
	readonly focusSide: (side: PageSide) => void;
	readonly onPan?: (panOffsetRatio: number) => void;
}

export function createReadingSwipe(options: ReadingSwipeOptions) {
	const {
		hit,
		portrait,
		focusedSide,
		startX,
		startY,
		startTime,
		beginTurn,
		focusSide,
		onPan
	} = options;

	let mode: 'pending' | 'tilt' | 'pan' | 'turn' = 'pending';
	const pageDirection: TurnDirection = hit.side === 'right' ? 1 : -1;
	let direction: TurnDirection = pageDirection;
	let turn: LeafTurn | null = null;
	let lastTime = startTime;
	let lastX = startX;
	let velocity = 0;
	const travel = Math.max(
		1,
		hit.width *
			(portrait
				? READING_SWIPE_CONFIG.portraitTravelRatio
				: READING_SWIPE_CONFIG.desktopTravelRatio)
	);

	function move(x: number, y: number, time: number): boolean {
		const dx = x - startX;
		const dy = y - startY;
		if (mode === 'pending') {
			if (isWithinTapThreshold(dx, dy)) return true;
			direction = dx < 0 ? 1 : -1;
			const desktopTilt = !portrait && (!hit.outerMargin || direction !== pageDirection);
			if (Math.abs(dy) > Math.abs(dx) || desktopTilt) {
				mode = 'tilt';
			} else if (portrait && swipeNavigation(focusedSide, direction) === 'pan') {
				mode = 'pan';
			} else {
				mode = 'turn';
				turn = beginTurn(direction);
			}
		}
		if (x !== lastX) {
			const rawVelocity =
				((direction * (lastX - x)) / travel) * (1000 / Math.max(8, time - lastTime));
			velocity = Math.max(
				-READING_SWIPE_CONFIG.maxSwipeVelocity,
				Math.min(READING_SWIPE_CONFIG.maxSwipeVelocity, rawVelocity)
			);
			lastTime = time;
			lastX = x;
		}
		if (turn) {
			setLeafTurnProgress(turn, (-direction * dx) / travel);
		} else if (mode === 'pan') {
			const panProgress = Math.max(0, Math.min(1, (-direction * dx) / travel));
			onPan?.(-direction * panProgress);
		}
		return mode !== 'tilt';
	}

	function end(x: number, y: number, time: number, cancelled: boolean): void {
		if (!cancelled) move(x, y, time);

		const speed = time - lastTime > READING_SWIPE_CONFIG.velocityStaleMs ? 0 : velocity;
		if (mode === 'pan') {
			onPan?.(0);
		}
		if (turn) {
			releaseLeafTurn(turn, speed, cancelled);
		} else if (
			!cancelled &&
			mode === 'pan' &&
			(-direction * (x - startX) >= READING_SWIPE_CONFIG.panCommitThresholdPx ||
				speed >= READING_SWIPE_CONFIG.panFlickVelocityThreshold)
		) {
			focusSide(direction === 1 ? 'right' : 'left');
		} else if (!cancelled && mode === 'pending' && !portrait && hit.outerMargin) {
			const clicked = beginTurn(direction);
			if (clicked) commitLeafTurn(clicked);
		}
	}

	return { move, end };
}

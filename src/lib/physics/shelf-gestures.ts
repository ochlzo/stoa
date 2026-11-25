import {
	SHELF_CAMERA_CONFIG,
	applyDragPan,
	applyPinchZoom,
	type ShelfCameraBounds,
	type ShelfCameraState
} from '#lib/physics/shelf-camera.ts';

interface Point {
	x: number;
	y: number;
}

export function createShelfGestures(camera: ShelfCameraState) {
	const pointers = new Map<number, Point>();
	let dragging = false;
	let lastTime = 0;

	function start(id: number, x: number, y: number, time: number) {
		pointers.set(id, { x, y });
		dragging = pointers.size > 1;
		camera.isDragging = true;
		camera.vx = camera.vy = 0;
		lastTime = time;
	}

	function move(id: number, x: number, y: number, time: number, height: number, bounds: ShelfCameraBounds, fov: number) {
		const previous = pointers.get(id);
		if (!previous) return;
		let dx = x - previous.x;
		let dy = y - previous.y;
		const pinching = pointers.size >= 2;
		if (pinching) {
			const [first, second] = pointers.keys();
			const other = pointers.get(id === first ? second : first)!;
			if (id !== first && id !== second) {
				pointers.set(id, { x, y });
				return;
			}
			const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
			const newDistance = Math.hypot(x - other.x, y - other.y);
			applyPinchZoom(camera, oldDistance / newDistance, bounds);
			// Moving one finger shifts the two-finger midpoint by half its displacement.
			dx /= 2;
			dy /= 2;
		} else if (!dragging && Math.hypot(dx, dy) < SHELF_CAMERA_CONFIG.dragThresholdPx) {
			return;
		}
		dragging = true;
		pointers.set(id, { x, y });
		applyDragPan(camera, dx, dy, (time - lastTime) / 1000, height, bounds, SHELF_CAMERA_CONFIG, fov);
		lastTime = time;
		if (pinching) camera.vx = camera.vy = 0;
		return pinching ? 'pinch' : 'pan';
	}

	function end(id: number, time: number, cancelled: boolean) {
		if (!pointers.delete(id)) return;
		camera.isDragging = pointers.size > 0;
		dragging = camera.isDragging;
		if (cancelled || time - lastTime > SHELF_CAMERA_CONFIG.dragReleaseGraceMs) camera.vx = camera.vy = 0;
		lastTime = time;
	}

	return { start, move, end };
}

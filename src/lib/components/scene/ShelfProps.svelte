<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';
	import { getShelfProps, type StackedBookSpec, type VaseProfile } from '#lib/catalog/props.ts';
	import { PAGE_BLOCK_CLAY_COLOR, VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';

	const props = getShelfProps();

	const VASE_PROFILES: Record<VaseProfile, readonly [radius: number, y: number][]> = {
		amphora: [
			[0.0, 0.0],
			[0.036, 0.0],
			[0.044, 0.02],
			[0.068, 0.075],
			[0.064, 0.125],
			[0.032, 0.165],
			[0.028, 0.195],
			[0.04, 0.215],
			[0.034, 0.215],
			[0.024, 0.19],
			[0.0, 0.16]
		],
		belly: [
			[0.0, 0.0],
			[0.048, 0.0],
			[0.078, 0.045],
			[0.084, 0.095],
			[0.064, 0.14],
			[0.036, 0.165],
			[0.042, 0.18],
			[0.036, 0.18],
			[0.028, 0.155],
			[0.0, 0.13]
		],
		bowl: [
			[0.0, 0.0],
			[0.042, 0.0],
			[0.072, 0.018],
			[0.096, 0.048],
			[0.102, 0.072],
			[0.094, 0.072],
			[0.084, 0.046],
			[0.046, 0.014],
			[0.0, 0.012]
		]
	};

	const OUTER_WALL_END: Record<VaseProfile, number> = {
		amphora: 7,
		belly: 6,
		bowl: 4
	};

	function createSmoothLathe(
		points: readonly [number, number][],
		outerWallEnd: number,
		segments = 40
	): THREE.LatheGeometry {
		const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
		const outerWall = new THREE.SplineCurve(vecs.slice(1, outerWallEnd + 1)).getPoints(
			outerWallEnd * 6
		);
		return new THREE.LatheGeometry([vecs[0], ...outerWall, ...vecs.slice(outerWallEnd + 1)], segments);
	}

	/**
	 * Sculpted pointed-oval leaf blade with a gentle lengthwise arch (origin at petiole base,
	 * extends along +Y so rotations around X/Z orient the leaf cleanly along any stem).
	 */
	function createCurvedLeafGeometry(
		length: number,
		halfWidth: number,
		thickness: number,
		arch: number
	): THREE.ExtrudeGeometry {
		const shape = new THREE.Shape();
		shape.moveTo(0, 0);
		shape.bezierCurveTo(halfWidth * 0.9, length * 0.18, halfWidth * 1.15, length * 0.62, 0, length);
		shape.bezierCurveTo(
			-halfWidth * 1.15,
			length * 0.62,
			-halfWidth * 0.9,
			length * 0.18,
			0,
			0
		);

		const geom = new THREE.ExtrudeGeometry(shape, {
			depth: thickness,
			bevelEnabled: true,
			bevelThickness: thickness * 0.45,
			bevelSize: thickness * 0.35,
			bevelSegments: 2,
			curveSegments: 10
		});

		// Gently cup and arch the blade along its length so it reads as living foliage, not cardboard
		const pos = geom.attributes.position;
		for (let i = 0; i < pos.count; i += 1) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = pos.getZ(i);
			const t = Math.max(0, y / length);
			const bend = -arch * t * t;
			const cup = Math.abs(x / halfWidth) * thickness * 1.2;
			pos.setZ(i, z - thickness / 2 + bend + cup);
		}
		geom.computeVertexNormals();
		return geom;
	}

	const vaseGeometries: Record<VaseProfile, THREE.LatheGeometry> = {
		amphora: createSmoothLathe(VASE_PROFILES.amphora, OUTER_WALL_END.amphora),
		belly: createSmoothLathe(VASE_PROFILES.belly, OUTER_WALL_END.belly),
		bowl: createSmoothLathe(VASE_PROFILES.bowl, OUTER_WALL_END.bowl)
	};

	// Rounded ceramic planter pot with a gentle belly and rolled rim (normalized radius 1, height 1)
	const planterPotGeometry = createSmoothLathe(
		[
			[0.0, 0.0],
			[0.72, 0.0],
			[0.86, 0.18],
			[1.0, 0.54],
			[0.98, 0.88],
			[1.02, 0.96],
			[0.96, 1.0],
			[0.88, 0.96],
			[0.86, 0.84],
			[0.0, 0.84]
		],
		6,
		36
	);

	// Organic foliage leaf (pothos/trailing houseplant) & plump spoon petal (echeveria succulent)
	const foliageLeafGeometry = createCurvedLeafGeometry(0.044, 0.017, 0.0018, 0.011);
	const succulentPetalGeometry = createCurvedLeafGeometry(0.032, 0.014, 0.0045, 0.007);

	// Smooth pinched double-bulb hourglass vessel normalized to height 1.0, radius 1.0
	const hourglassBulbGeometry = createSmoothLathe(
		[
			[0.0, 0.0],
			[0.58, 0.0],
			[0.72, 0.16],
			[0.54, 0.34],
			[0.14, 0.5],
			[0.54, 0.66],
			[0.72, 0.84],
			[0.58, 1.0],
			[0.0, 1.0]
		],
		7,
		32
	);

	// Turned classical candlestick pedestal normalized to height 1.0, base radius 1.0
	const candlestickHolderGeometry = createSmoothLathe(
		[
			[0.0, 0.0],
			[1.0, 0.0],
			[0.92, 0.08],
			[0.56, 0.18],
			[0.28, 0.34],
			[0.38, 0.52],
			[0.24, 0.72],
			[0.44, 0.88],
			[0.64, 0.96],
			[0.56, 1.0],
			[0.34, 0.94],
			[0.0, 0.92]
		],
		9,
		32
	);

	interface StemLeafPlacement {
		readonly key: string;
		readonly position: readonly [number, number, number];
		readonly rotation: readonly [number, number, number];
		readonly scale: number;
	}

	interface TrailingPlantBuild {
		readonly stemGeometries: readonly THREE.TubeGeometry[];
		readonly leaves: readonly StemLeafPlacement[];
	}

	/**
	 * Builds curved arching stems (Catmull-Rom TubeGeometry) and paired sculpted leaves
	 * for a trailing/arching houseplant (pothos-inspired, with a couple sprigs spilling gently over the rim).
	 */
	function buildTrailingPlant(potRadius: number, potHeight: number): TrailingPlantBuild {
		const stemSpecs = [
			// Three upright arching crown stems
			{ azimuth: 0.3, reach: potRadius * 1.15, peakY: 0.115, tipY: 0.088, tipDrop: false },
			{ azimuth: 2.35, reach: potRadius * 1.05, peakY: 0.125, tipY: 0.102, tipDrop: false },
			{ azimuth: 4.35, reach: potRadius * 1.1, peakY: 0.108, tipY: 0.082, tipDrop: false },
			// Four graceful outer stems arching out and slightly over the stoneware rim
			{ azimuth: 1.25, reach: potRadius * 1.55, peakY: 0.072, tipY: 0.008, tipDrop: true },
			{ azimuth: 3.35, reach: potRadius * 1.48, peakY: 0.068, tipY: 0.014, tipDrop: true },
			{ azimuth: 5.35, reach: potRadius * 1.62, peakY: 0.062, tipY: -0.022, tipDrop: true },
			{ azimuth: -0.55, reach: potRadius * 1.45, peakY: 0.078, tipY: 0.022, tipDrop: true }
		] as const;

		const soilY = potHeight * 0.86;
		const stemGeometries: THREE.TubeGeometry[] = [];
		const leaves: StemLeafPlacement[] = [];

		stemSpecs.forEach((spec, sIdx) => {
			const dirX = Math.cos(spec.azimuth);
			const dirZ = Math.sin(spec.azimuth);
			const startR = potRadius * 0.18;

			const p0 = new THREE.Vector3(dirX * startR, soilY, dirZ * startR);
			const p1 = new THREE.Vector3(dirX * spec.reach * 0.36, soilY + spec.peakY * 0.82, dirZ * spec.reach * 0.36);
			const p2 = new THREE.Vector3(dirX * spec.reach * 0.76, soilY + spec.peakY, dirZ * spec.reach * 0.76);
			const p3 = new THREE.Vector3(dirX * spec.reach, soilY + spec.tipY, dirZ * spec.reach);

			const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
			stemGeometries.push(new THREE.TubeGeometry(curve, 14, 0.0022, 6, false));

			const leafFractions = spec.tipDrop ? [0.42, 0.68, 0.9, 1.0] : [0.48, 0.76, 1.0];
			leafFractions.forEach((t, lIdx) => {
				const pt = curve.getPoint(t);
				const isTip = t >= 0.99;
				const sideSign = isTip ? 0 : lIdx % 2 === 0 ? 1 : -1;
				const yaw = -spec.azimuth + Math.PI / 2 + sideSign * 0.55;
				const pitch = spec.tipDrop ? 0.85 + t * 0.65 : 0.42 + t * 0.55;
				const scale = isTip ? 0.78 : 0.88 + (1 - t) * 0.25;

				leaves.push({
					key: `stem-${sIdx}-leaf-${lIdx}`,
					position: [pt.x, pt.y, pt.z],
					rotation: [pitch, yaw, sideSign * 0.25],
					scale
				});
			});
		});

		return { stemGeometries, leaves };
	}

	const trailingPlants = new Map<string, TrailingPlantBuild>();
	for (const prop of props) {
		if (prop.kind === 'planter' && prop.leafStyle === 'tall') {
			trailingPlants.set(prop.id, buildTrailingPlant(prop.potRadius, prop.potHeight));
		}
	}

	// Dispose all manually constructed Three.js geometries on unmount (CODING_STANDARD.md)
	$effect(() => {
		return () => {
			for (const geom of Object.values(vaseGeometries)) {
				geom.dispose();
			}
			planterPotGeometry.dispose();
			foliageLeafGeometry.dispose();
			succulentPetalGeometry.dispose();
			hourglassBulbGeometry.dispose();
			candlestickHolderGeometry.dispose();
			for (const plant of trailingPlants.values()) {
				for (const stemGeom of plant.stemGeometries) {
					stemGeom.dispose();
				}
			}
		};
	});

	function stackLayers(books: readonly StackedBookSpec[]) {
		let y = 0;
		return books.map((book, index) => {
			const centerY = y + book.thickness / 2;
			y += book.thickness + 0.0006;
			return { book, centerY, index };
		});
	}

	function stackTotalHeight(books: readonly StackedBookSpec[]): number {
		return books.reduce((sum, b) => sum + b.thickness + 0.0006, 0);
	}

	function rosettePetals(count: number, potRadius: number) {
		const goldenAngle = 2.399963229728653;
		return Array.from({ length: count }, (_, i) => {
			const t = i / Math.max(1, count - 1);
			const angle = i * goldenAngle;
			const radialOffset = potRadius * (0.08 + t * 0.44);
			const pitch = 0.28 + t * 0.92;
			const scale = 0.62 + t * 0.52;
			return { i, angle, radialOffset, pitch, scale };
		});
	}

	const HOURGLASS_ROD_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3] as const;
</script>

<T.Group name="shelf-props">
	{#each props as prop (prop.id)}
		{#if prop.kind === 'vase'}
			<T.Mesh
				name={prop.id}
				geometry={vaseGeometries[prop.profile]}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
				scale={[prop.scale, prop.scale, prop.scale]}
			>
				<T.MeshStandardMaterial
					color={VOLUME_CLAY_COLORS[prop.clayTone]}
					roughness={0.86}
					metalness={0}
				/>
			</T.Mesh>
		{:else if prop.kind === 'frame'}
			{@const border = 0.018}
			{@const pivotY = prop.position[1] + (prop.thickness / 2) * Math.sin(Math.abs(prop.tiltX))}
			<T.Group
				name={prop.id}
				position={[prop.position[0], pivotY, prop.position[2]]}
				rotation={[prop.tiltX, 0, 0]}
			>
				<!-- Outer frame rails -->
				<T.Mesh position={[0, prop.height - border / 2, 0]}>
					<T.BoxGeometry args={[prop.width, border, prop.thickness]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.9}
						metalness={0}
					/>
				</T.Mesh>
				<T.Mesh position={[0, border / 2, 0]}>
					<T.BoxGeometry args={[prop.width, border, prop.thickness]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.9}
						metalness={0}
					/>
				</T.Mesh>
				<T.Mesh position={[-(prop.width - border) / 2, prop.height / 2, 0]}>
					<T.BoxGeometry args={[border, prop.height - border * 2, prop.thickness]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.9}
						metalness={0}
					/>
				</T.Mesh>
				<T.Mesh position={[(prop.width - border) / 2, prop.height / 2, 0]}>
					<T.BoxGeometry args={[border, prop.height - border * 2, prop.thickness]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.9}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Recessed matte backing -->
				<T.Mesh position={[0, prop.height / 2, -prop.thickness * 0.22]}>
					<T.BoxGeometry
						args={[prop.width - border * 2, prop.height - border * 2, prop.thickness * 0.45]}
					/>
					<T.MeshStandardMaterial color={PAGE_BLOCK_CLAY_COLOR} roughness={0.95} metalness={0} />
				</T.Mesh>
				<!-- Minimal sculptural relief inside the print -->
				<T.Mesh
					position={[0, prop.height * 0.48, prop.thickness * 0.04]}
					rotation={[Math.PI / 2, 0, 0]}
				>
					<T.CylinderGeometry
						args={[prop.width * 0.22, prop.width * 0.22, 0.002, 24]}
					/>
					<T.MeshStandardMaterial color="#c8c5be" roughness={0.94} metalness={0} />
				</T.Mesh>
			</T.Group>
		{:else if prop.kind === 'planter'}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				<!-- Turned rounded stoneware pot -->
				<T.Mesh
					geometry={planterPotGeometry}
					scale={[prop.potRadius, prop.potHeight, prop.potRadius]}
				>
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.86}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Soil bed tucked cleanly inside the rim -->
				<T.Mesh position={[0, prop.potHeight * 0.85, 0]}>
					<T.CylinderGeometry args={[prop.potRadius * 0.84, prop.potRadius * 0.84, 0.006, 22]} />
					<T.MeshStandardMaterial color="#9e9b94" roughness={0.96} metalness={0} />
				</T.Mesh>

				{#if prop.leafStyle === 'tall'}
					{@const built = trailingPlants.get(prop.id)}
					{#if built}
						{#each built.stemGeometries as stemGeom, idx (idx)}
							<T.Mesh geometry={stemGeom}>
								<T.MeshStandardMaterial color="#a6a49d" roughness={0.92} metalness={0} />
							</T.Mesh>
						{/each}
						{#each built.leaves as leaf (leaf.key)}
							<T.Mesh
								geometry={foliageLeafGeometry}
								position={[leaf.position[0], leaf.position[1], leaf.position[2]]}
								rotation={[leaf.rotation[0], leaf.rotation[1], leaf.rotation[2]]}
								scale={[leaf.scale, leaf.scale, leaf.scale]}
							>
								<T.MeshStandardMaterial color="#b4b2ab" roughness={0.88} metalness={0} />
							</T.Mesh>
						{/each}
					{/if}
				{:else}
					{@const petals = rosettePetals(prop.leafCount, prop.potRadius)}
					{#each petals as petal (petal.i)}
						<T.Group position={[0, prop.potHeight * 0.87, 0]} rotation={[0, petal.angle, 0]}>
							<T.Mesh
								geometry={succulentPetalGeometry}
								position={[0, 0, petal.radialOffset]}
								rotation={[petal.pitch, 0, 0]}
								scale={[petal.scale, petal.scale, petal.scale]}
							>
								<T.MeshStandardMaterial color="#b7b5ae" roughness={0.88} metalness={0} />
							</T.Mesh>
						</T.Group>
					{/each}
				{/if}
			</T.Group>
		{:else if prop.kind === 'bookend'}
			{@const archHeight = prop.height - prop.width * 0.5}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				<!-- Architectural stepped monolith + arched top -->
				<T.Mesh position={[0, archHeight / 2, 0]}>
					<T.BoxGeometry args={[prop.width, archHeight, prop.depth]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.88}
						metalness={0}
					/>
				</T.Mesh>
				<T.Mesh position={[0, archHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<T.CylinderGeometry
						args={[prop.width / 2, prop.width / 2, prop.depth, 18, 1, false, Math.PI / 2, Math.PI]}
					/>
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.88}
						metalness={0}
					/>
				</T.Mesh>
			</T.Group>
		{:else if prop.kind === 'sculpture'}
			<T.Mesh
				name={prop.id}
				position={[prop.position[0], prop.position[1] + prop.radius * 0.88, prop.position[2]]}
				rotation={[0.42, 0.65, 0.2]}
			>
				<T.IcosahedronGeometry args={[prop.radius, 0]} />
				<T.MeshStandardMaterial
					color={VOLUME_CLAY_COLORS[prop.clayTone]}
					roughness={0.84}
					metalness={0}
					flatShading
				/>
			</T.Mesh>
		{:else if prop.kind === 'globe'}
			{@const baseH = 0.014}
			{@const stemH = 0.044}
			{@const arcRadius = prop.radius + 0.014}
			{@const centerY = baseH + stemH + arcRadius}
			{@const axisTilt = 0.41}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				<!-- Circular stepped pedestal base -->
				<T.Mesh position={[0, baseH / 2, 0]}>
					<T.CylinderGeometry args={[prop.radius * 0.72, prop.radius * 0.84, baseH, 28]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS.charcoal}
						roughness={0.86}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Slender support stem -->
				<T.Mesh position={[0, baseH + stemH / 2, 0]}>
					<T.CylinderGeometry args={[0.007, 0.011, stemH, 16]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS.charcoal}
						roughness={0.86}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Tilted meridian C-arc + globe assembly -->
				<T.Group position={[0, centerY, 0]} rotation={[0, 0.25, -axisTilt]}>
					<!-- Meridian arc -->
					<T.Mesh rotation={[0, 0, -Math.PI / 2]}>
						<T.TorusGeometry args={[arcRadius, 0.0045, 10, 32, Math.PI]} />
						<T.MeshStandardMaterial
							color={VOLUME_CLAY_COLORS.charcoal}
							roughness={0.84}
							metalness={0}
						/>
					</T.Mesh>
					<!-- Axis spindle -->
					<T.Mesh>
						<T.CylinderGeometry args={[0.003, 0.003, arcRadius * 2, 10]} />
						<T.MeshStandardMaterial
							color={VOLUME_CLAY_COLORS.charcoal}
							roughness={0.84}
							metalness={0}
						/>
					</T.Mesh>
					<!-- Globe sphere -->
					<T.Mesh>
						<T.SphereGeometry args={[prop.radius, 28, 20]} />
						<T.MeshStandardMaterial
							color={VOLUME_CLAY_COLORS[prop.clayTone]}
							roughness={0.88}
							metalness={0}
						/>
					</T.Mesh>
					<!-- Subtle equatorial band -->
					<T.Mesh rotation={[Math.PI / 2, 0, 0]}>
						<T.TorusGeometry args={[prop.radius + 0.0008, 0.0018, 8, 36]} />
						<T.MeshStandardMaterial
							color={VOLUME_CLAY_COLORS.slateClay}
							roughness={0.9}
							metalness={0}
						/>
					</T.Mesh>
				</T.Group>
			</T.Group>
		{:else if prop.kind === 'hourglass'}
			{@const capH = 0.011}
			{@const innerH = prop.height - capH * 2}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				<!-- Bottom & top turned caps -->
				<T.Mesh position={[0, capH / 2, 0]}>
					<T.CylinderGeometry args={[prop.radius, prop.radius * 1.04, capH, 24]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS.charcoal}
						roughness={0.86}
						metalness={0}
					/>
				</T.Mesh>
				<T.Mesh position={[0, prop.height - capH / 2, 0]}>
					<T.CylinderGeometry args={[prop.radius * 1.04, prop.radius, capH, 24]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS.charcoal}
						roughness={0.86}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Three slender perimeter pillars -->
				{#each HOURGLASS_ROD_ANGLES as angle, idx (idx)}
					<T.Mesh
						position={[
							Math.cos(angle) * prop.radius * 0.84,
							prop.height / 2,
							Math.sin(angle) * prop.radius * 0.84
						]}
					>
						<T.CylinderGeometry args={[0.0024, 0.0024, innerH, 8]} />
						<T.MeshStandardMaterial
							color={VOLUME_CLAY_COLORS.charcoal}
							roughness={0.84}
							metalness={0}
						/>
					</T.Mesh>
				{/each}
				<!-- Double-bulb vessel -->
				<T.Mesh
					geometry={hourglassBulbGeometry}
					position={[0, capH, 0]}
					scale={[prop.radius, innerH, prop.radius]}
				>
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.82}
						metalness={0}
					/>
				</T.Mesh>
			</T.Group>
		{:else if prop.kind === 'candlestick'}
			{@const holderH = prop.height * 0.62}
			{@const candleH = prop.height * 0.36}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				<!-- Turned candlestick holder -->
				<T.Mesh
					geometry={candlestickHolderGeometry}
					scale={[prop.baseRadius, holderH, prop.baseRadius]}
				>
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.84}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Slender matte taper candle -->
				<T.Mesh position={[0, holderH * 0.94 + candleH / 2, 0]}>
					<T.CylinderGeometry args={[0.0075, 0.0095, candleH, 16]} />
					<T.MeshStandardMaterial color={PAGE_BLOCK_CLAY_COLOR} roughness={0.92} metalness={0} />
				</T.Mesh>
				<!-- Tiny wick stub -->
				<T.Mesh position={[0, holderH * 0.94 + candleH + 0.004, 0]}>
					<T.CylinderGeometry args={[0.001, 0.0012, 0.008, 6]} />
					<T.MeshStandardMaterial color="#8f8c86" roughness={0.96} metalness={0} />
				</T.Mesh>
			</T.Group>
		{:else if prop.kind === 'keepsake-box'}
			{@const lidH = prop.height * 0.28}
			{@const bodyH = prop.height - lidH}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
				rotation={[0, prop.yaw, 0]}
			>
				<!-- Box body -->
				<T.Mesh position={[0, bodyH / 2, 0]}>
					<T.BoxGeometry args={[prop.width, bodyH, prop.depth]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.88}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Overhanging lid -->
				<T.Mesh position={[0, bodyH + lidH / 2 + 0.0005, 0]}>
					<T.BoxGeometry args={[prop.width + 0.006, lidH, prop.depth + 0.006]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.86}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Small turned finial knob on lid -->
				<T.Mesh position={[0, bodyH + lidH + 0.005, 0]}>
					<T.SphereGeometry args={[0.0065, 14, 12]} />
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS.alabaster}
						roughness={0.84}
						metalness={0}
					/>
				</T.Mesh>
			</T.Group>
		{:else if prop.kind === 'book-stack'}
			{@const layers = stackLayers(prop.books)}
			{@const topY = stackTotalHeight(prop.books)}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				{#each layers as { book, centerY, index } (index)}
					{@const boardH = 0.003}
					<T.Group position={[book.offsetX, centerY, 0]} rotation={[0, book.yaw, 0]}>
						<!-- Bottom cover -->
						<T.Mesh position={[0, -(book.thickness / 2 - boardH / 2), 0]}>
							<T.BoxGeometry args={[book.width, boardH, book.depth]} />
							<T.MeshStandardMaterial
								color={VOLUME_CLAY_COLORS[book.clayTone]}
								roughness={0.9}
								metalness={0}
							/>
						</T.Mesh>
						<!-- Top cover -->
						<T.Mesh position={[0, book.thickness / 2 - boardH / 2, 0]}>
							<T.BoxGeometry args={[book.width, boardH, book.depth]} />
							<T.MeshStandardMaterial
								color={VOLUME_CLAY_COLORS[book.clayTone]}
								roughness={0.9}
								metalness={0}
							/>
						</T.Mesh>
						<!-- Spine facing +Z -->
						<T.Mesh position={[0, 0, book.depth / 2 - 0.004]}>
							<T.BoxGeometry args={[book.width, book.thickness, 0.008]} />
							<T.MeshStandardMaterial
								color={VOLUME_CLAY_COLORS[book.clayTone]}
								roughness={0.9}
								metalness={0}
							/>
						</T.Mesh>
						<!-- Recessed page block -->
						<T.Mesh position={[0, 0, -0.004]}>
							<T.BoxGeometry
								args={[
									book.width - 0.008,
									book.thickness - boardH * 2 - 0.0006,
									book.depth - 0.012
								]}
							/>
							<T.MeshStandardMaterial
								color={PAGE_BLOCK_CLAY_COLOR}
								roughness={0.95}
								metalness={0}
							/>
						</T.Mesh>
					</T.Group>
				{/each}

				{#if prop.topper}
					{#if prop.topper.profile === 'sculpture'}
						<T.Mesh position={[0, topY + 0.045 * prop.topper.scale, 0]}>
							<T.IcosahedronGeometry args={[0.048 * prop.topper.scale, 0]} />
							<T.MeshStandardMaterial
								color={VOLUME_CLAY_COLORS[prop.topper.clayTone]}
								roughness={0.86}
								metalness={0}
								flatShading
							/>
						</T.Mesh>
					{:else if prop.topper.profile === 'hourglass'}
						{@const h = 0.125 * prop.topper.scale}
						{@const r = 0.032 * prop.topper.scale}
						{@const capH = 0.009 * prop.topper.scale}
						{@const innerH = h - capH * 2}
						<T.Group position={[0, topY, 0]}>
							<T.Mesh position={[0, capH / 2, 0]}>
								<T.CylinderGeometry args={[r, r * 1.04, capH, 24]} />
								<T.MeshStandardMaterial
									color={VOLUME_CLAY_COLORS.charcoal}
									roughness={0.86}
									metalness={0}
								/>
							</T.Mesh>
							<T.Mesh position={[0, h - capH / 2, 0]}>
								<T.CylinderGeometry args={[r * 1.04, r, capH, 24]} />
								<T.MeshStandardMaterial
									color={VOLUME_CLAY_COLORS.charcoal}
									roughness={0.86}
									metalness={0}
								/>
							</T.Mesh>
							{#each HOURGLASS_ROD_ANGLES as angle, idx (idx)}
								<T.Mesh position={[Math.cos(angle) * r * 0.84, h / 2, Math.sin(angle) * r * 0.84]}>
									<T.CylinderGeometry args={[0.0022, 0.0022, innerH, 8]} />
									<T.MeshStandardMaterial
										color={VOLUME_CLAY_COLORS.charcoal}
										roughness={0.84}
										metalness={0}
									/>
								</T.Mesh>
							{/each}
							<T.Mesh
								geometry={hourglassBulbGeometry}
								position={[0, capH, 0]}
								scale={[r, innerH, r]}
							>
								<T.MeshStandardMaterial
									color={VOLUME_CLAY_COLORS[prop.topper.clayTone]}
									roughness={0.82}
									metalness={0}
								/>
							</T.Mesh>
						</T.Group>
					{:else}
						<T.Mesh
							geometry={vaseGeometries[prop.topper.profile]}
							position={[0, topY, 0]}
							scale={[prop.topper.scale, prop.topper.scale, prop.topper.scale]}
						>
							<T.MeshStandardMaterial
								color={VOLUME_CLAY_COLORS[prop.topper.clayTone]}
								roughness={0.86}
								metalness={0}
							/>
						</T.Mesh>
					{/if}
				{/if}
			</T.Group>
		{/if}
	{/each}
</T.Group>

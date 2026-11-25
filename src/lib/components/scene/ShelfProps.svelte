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
		tall: [
			[0.0, 0.0],
			[0.042, 0.0],
			[0.052, 0.05],
			[0.05, 0.13],
			[0.034, 0.19],
			[0.03, 0.235],
			[0.035, 0.248],
			[0.029, 0.248],
			[0.024, 0.21],
			[0.0, 0.18]
		],
		bud: [
			[0.0, 0.0],
			[0.032, 0.0],
			[0.046, 0.035],
			[0.044, 0.07],
			[0.022, 0.105],
			[0.018, 0.128],
			[0.022, 0.135],
			[0.017, 0.135],
			[0.013, 0.1],
			[0.0, 0.08]
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

	function createLatheGeometry(points: readonly [number, number][]): THREE.LatheGeometry {
		const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
		return new THREE.LatheGeometry(vecs, 28);
	}

	const vaseGeometries: Record<VaseProfile, THREE.LatheGeometry> = {
		amphora: createLatheGeometry(VASE_PROFILES.amphora),
		belly: createLatheGeometry(VASE_PROFILES.belly),
		tall: createLatheGeometry(VASE_PROFILES.tall),
		bud: createLatheGeometry(VASE_PROFILES.bud),
		bowl: createLatheGeometry(VASE_PROFILES.bowl)
	};

	// Dispose manually constructed LatheGeometries on unmount (CODING_STANDARD.md)
	$effect(() => {
		return () => {
			for (const geom of Object.values(vaseGeometries)) {
				geom.dispose();
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

	function planterLeaves(count: number, style: 'rosette' | 'tall', potRadius: number) {
		const goldenAngle = 2.399963229728653;
		return Array.from({ length: count }, (_, i) => {
			const t = (i + 0.5) / count;
			const angle = i * goldenAngle;
			const radialOffset = style === 'rosette' ? potRadius * (0.18 + t * 0.42) : potRadius * (0.12 + t * 0.35);
			const tilt = style === 'rosette' ? 0.35 + t * 0.85 : 0.16 + t * 0.52;
			const length = style === 'rosette' ? 0.036 + (1 - t) * 0.018 : 0.09 + (1 - t * 0.5) * 0.06;
			const width = style === 'rosette' ? 0.018 : 0.014;
			return { i, angle, radialOffset, tilt, length, width };
		});
	}
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
			{@const leaves = planterLeaves(prop.leafCount, prop.leafStyle, prop.potRadius)}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				<!-- Tapered stoneware pot -->
				<T.Mesh position={[0, prop.potHeight / 2, 0]}>
					<T.CylinderGeometry
						args={[prop.potRadius, prop.potRadius * 0.78, prop.potHeight, 24]}
					/>
					<T.MeshStandardMaterial
						color={VOLUME_CLAY_COLORS[prop.clayTone]}
						roughness={0.88}
						metalness={0}
					/>
				</T.Mesh>
				<!-- Soil bed -->
				<T.Mesh position={[0, prop.potHeight - 0.006, 0]}>
					<T.CylinderGeometry args={[prop.potRadius * 0.9, prop.potRadius * 0.9, 0.008, 20]} />
					<T.MeshStandardMaterial color="#a8a59e" roughness={0.96} metalness={0} />
				</T.Mesh>
				<!-- Procedural clay botanical leaves -->
				{#each leaves as leaf (leaf.i)}
					<T.Group position={[0, prop.potHeight - 0.004, 0]} rotation={[0, leaf.angle, 0]}>
						<T.Mesh
							position={[leaf.radialOffset, leaf.length * 0.42, 0]}
							rotation={[0, 0, -leaf.tilt]}
						>
							<T.ConeGeometry args={[leaf.width, leaf.length, 5]} />
							<T.MeshStandardMaterial color="#b4b3ac" roughness={0.9} metalness={0} />
						</T.Mesh>
					</T.Group>
				{/each}
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
								args={[book.width - 0.008, book.thickness - boardH * 2 - 0.0006, book.depth - 0.012]}
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

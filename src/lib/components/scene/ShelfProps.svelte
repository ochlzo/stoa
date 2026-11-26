<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SHELF_PROP_MATERIALS as presets, type ShelfPropFinish } from '#lib/catalog/shelf-prop-materials.ts';
	import { createShelfPropMaterials } from '#lib/components/scene/shelf-prop-material-geometry.ts';
	import type { VolumeFinishes } from '#lib/textures/volume-finishes.ts';
	import { T } from '@threlte/core';
	import type { Group, Mesh } from 'three';
	import { createShelfPropGeometry } from '#lib/components/scene/shelf-prop-geometry.ts';
	import { getShelfProps } from '#lib/catalog/props.ts';
	import { PAGE_BLOCK_CLAY_COLOR, VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';

	import {
		getFramePivotY, getHourglassRods, getSculptureCenterY, layoutBookStack, rosettePetals,
		sculptureTilt, STACK_COVER_THICKNESS, STACK_SPINE_DEPTH
	} from '#lib/catalog/prop-layout.ts';

	let { finishes }: { finishes: VolumeFinishes } = $props();
	const materials = createShelfPropMaterials();
	onDestroy(materials.dispose);
	const shelfProps = getShelfProps();
	const shadowsEnabled = $derived(!isClayMode());
	let propsGroupRef = $state<Group | undefined>(undefined);

	const {
		vaseGeometries, planterPotGeometry, foliageLeafGeometry, succulentPetalGeometry,
		hourglassBulbGeometry, candlestickHolderGeometry, trailingPlants, dispose
	} = createShelfPropGeometry(shelfProps);

	$effect(() => dispose);

	$effect(() => {
		const group = propsGroupRef;
		const enabled = shadowsEnabled;
		if (!group) return;
		group.traverse((obj) => {
			if ('isMesh' in obj && (obj as Mesh).isMesh) {
				obj.castShadow = enabled;
				obj.receiveShadow = enabled;
			}
		});
	});
</script>

{#snippet surface(kind: ShelfPropFinish, clayColor: string, clayRoughness: number, flatShading = false)}
	{#if isClayMode()}
		<T.MeshStandardMaterial color={clayColor} roughness={clayRoughness} {flatShading} />
	{:else}
		<T is={materials.get(kind, finishes)} dispose={false} />
	{/if}
{/snippet}

<T.Group
	name="shelf-props"
	oncreate={(group) => {
		propsGroupRef = group;
	}}
>
	{#each shelfProps as prop (prop.id)}
		{#if prop.kind === 'vase'}
			<T.Mesh
				name={prop.id}
				geometry={vaseGeometries[prop.profile]}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
				scale={[prop.scale, prop.scale, prop.scale]}
			>
				{@render surface(presets.vase[prop.profile], VOLUME_CLAY_COLORS[prop.clayTone], 0.86)}
			</T.Mesh>
		{:else if prop.kind === 'frame'}
			{@const border = 0.018}
			{@const pivotY = getFramePivotY(prop)}
			<T.Group
				name={prop.id}
				position={[prop.position[0], pivotY, prop.position[2]]}
				rotation={[prop.tiltX, 0, 0]}
			>
				<!-- Outer frame rails -->
				<T.Mesh position={[0, prop.height - border / 2, 0]}>
					<T.BoxGeometry args={[prop.width, border, prop.thickness]} />
					{@render surface(presets.frame.rail, VOLUME_CLAY_COLORS[prop.clayTone], 0.9)}
				</T.Mesh>
				<T.Mesh position={[0, border / 2, 0]}>
					<T.BoxGeometry args={[prop.width, border, prop.thickness]} />
					{@render surface(presets.frame.rail, VOLUME_CLAY_COLORS[prop.clayTone], 0.9)}
				</T.Mesh>
				<T.Mesh position={[-(prop.width - border) / 2, prop.height / 2, 0]}>
					<T.BoxGeometry args={[border, prop.height - border * 2, prop.thickness]} />
					{@render surface(presets.frame.rail, VOLUME_CLAY_COLORS[prop.clayTone], 0.9)}
				</T.Mesh>
				<T.Mesh position={[(prop.width - border) / 2, prop.height / 2, 0]}>
					<T.BoxGeometry args={[border, prop.height - border * 2, prop.thickness]} />
					{@render surface(presets.frame.rail, VOLUME_CLAY_COLORS[prop.clayTone], 0.9)}
				</T.Mesh>
				<!-- Recessed matte backing -->
				<T.Mesh position={[0, prop.height / 2, -prop.thickness * 0.22]}>
					<T.BoxGeometry
						args={[prop.width - border * 2, prop.height - border * 2, prop.thickness * 0.45]}
					/>
					{@render surface(presets.frame[prop.print], PAGE_BLOCK_CLAY_COLOR, 0.95)}
				</T.Mesh>
				{#if isClayMode()}
				<!-- Clay relief used before the print is applied. -->
				<T.Mesh
					position={[0, prop.height * 0.48, prop.thickness * 0.04]}
					rotation={[Math.PI / 2, 0, 0]}
				>
					<T.CylinderGeometry
						args={[prop.width * 0.22, prop.width * 0.22, 0.002, 24]}
					/>
					<T.MeshStandardMaterial color="#c8c5be" roughness={0.94} metalness={0} />
				</T.Mesh>
				{/if}
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
					{@render surface(presets.planter[prop.leafStyle], VOLUME_CLAY_COLORS[prop.clayTone], 0.86)}
				</T.Mesh>
				<!-- Soil bed tucked cleanly inside the rim -->
				<T.Mesh position={[0, prop.potHeight * 0.85, 0]}>
					<T.CylinderGeometry args={[prop.potRadius * 0.84, prop.potRadius * 0.84, 0.006, 22]} />
					{@render surface(presets.planter.soil, '#9e9b94', 0.96)}
				</T.Mesh>

				{#if prop.leafStyle === 'tall'}
					{@const built = trailingPlants.get(prop.id)}
					{#if built}
						{#each built.stemGeometries as stemGeom, idx (idx)}
							<T.Mesh geometry={stemGeom}>
								{@render surface(presets.planter.stem, '#a6a49d', 0.92)}
							</T.Mesh>
						{/each}
						{#each built.leaves as leaf (leaf.key)}
							<T.Mesh
								geometry={foliageLeafGeometry}
								position={[leaf.position[0], leaf.position[1], leaf.position[2]]}
								rotation={[leaf.rotation[0], leaf.rotation[1], leaf.rotation[2]]}
								scale={[leaf.scale, leaf.scale, leaf.scale]}
							>
								{@render surface(presets.planter.leaf, '#b4b2ab', 0.88)}
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
								{@render surface(presets.planter.petal, '#b7b5ae', 0.88)}
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
					{@render surface(presets.bookend.body, VOLUME_CLAY_COLORS[prop.clayTone], 0.88)}
				</T.Mesh>
				<T.Mesh position={[0, archHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<T.CylinderGeometry
						args={[prop.width / 2, prop.width / 2, prop.depth, 18, 1, false, Math.PI / 2, Math.PI]}
					/>
					{@render surface(presets.bookend.body, VOLUME_CLAY_COLORS[prop.clayTone], 0.88)}
				</T.Mesh>
			</T.Group>
		{:else if prop.kind === 'sculpture'}
			<T.Mesh
				name={prop.id}
				position={[prop.position[0], getSculptureCenterY(prop.position[1], prop.radius), prop.position[2]]}
				rotation={[sculptureTilt, 0, 0]}
			>
				<T.IcosahedronGeometry args={[prop.radius, 0]} />
				{@render surface(presets.sculpture.body, VOLUME_CLAY_COLORS[prop.clayTone], 0.84, true)}
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
					{@render surface(presets.globe.base, VOLUME_CLAY_COLORS.charcoal, 0.86)}
				</T.Mesh>
				<!-- Slender support stem -->
				<T.Mesh position={[0, baseH + stemH / 2, 0]}>
					<T.CylinderGeometry args={[0.007, 0.011, stemH, 16]} />
					{@render surface(presets.globe.base, VOLUME_CLAY_COLORS.charcoal, 0.86)}
				</T.Mesh>
				<!-- Tilted meridian C-arc + globe assembly -->
				<T.Group position={[0, centerY, 0]} rotation={[0, 0.25, -axisTilt]}>
					<!-- Meridian arc -->
					<T.Mesh rotation={[0, 0, -Math.PI / 2]}>
						<T.TorusGeometry args={[arcRadius, 0.0045, 10, 32, Math.PI]} />
						{@render surface(presets.globe.meridian, VOLUME_CLAY_COLORS.charcoal, 0.84)}
					</T.Mesh>
					<!-- Axis spindle -->
					<T.Mesh>
						<T.CylinderGeometry args={[0.003, 0.003, arcRadius * 2, 10]} />
						{@render surface(presets.globe.meridian, VOLUME_CLAY_COLORS.charcoal, 0.84)}
					</T.Mesh>
					<!-- Globe sphere -->
					<T.Mesh>
						<T.SphereGeometry args={[prop.radius, 28, 20]} />
						{@render surface(presets.globe.sphere, VOLUME_CLAY_COLORS[prop.clayTone], 0.88)}
					</T.Mesh>
					<!-- Subtle equatorial band -->
					<T.Mesh rotation={[Math.PI / 2, 0, 0]}>
						<T.TorusGeometry args={[prop.radius + 0.0008, 0.0018, 8, 36]} />
						{@render surface(presets.globe.meridian, VOLUME_CLAY_COLORS.slateClay, 0.9)}
					</T.Mesh>
				</T.Group>
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
					{@render surface(presets.candlestick.holder, VOLUME_CLAY_COLORS[prop.clayTone], 0.84)}
				</T.Mesh>
				<!-- Slender matte taper candle -->
				<T.Mesh position={[0, holderH * 0.94 + candleH / 2, 0]}>
					<T.CylinderGeometry args={[0.0075, 0.0095, candleH, 16]} />
					{@render surface(presets.candlestick.taper, PAGE_BLOCK_CLAY_COLOR, 0.92)}
				</T.Mesh>
				<!-- Tiny wick stub -->
				<T.Mesh position={[0, holderH * 0.94 + candleH + 0.004, 0]}>
					<T.CylinderGeometry args={[0.001, 0.0012, 0.008, 6]} />
					{@render surface(presets.candlestick.wick, '#8f8c86', 0.96)}
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
					{@render surface(presets['keepsake-box'].body, VOLUME_CLAY_COLORS[prop.clayTone], 0.88)}
				</T.Mesh>
				<!-- Overhanging lid -->
				<T.Mesh position={[0, bodyH + lidH / 2 + 0.0005, 0]}>
					<T.BoxGeometry args={[prop.width + 0.006, lidH, prop.depth + 0.006]} />
					{@render surface(presets['keepsake-box'].body, VOLUME_CLAY_COLORS[prop.clayTone], 0.86)}
				</T.Mesh>
				<!-- Small turned finial knob on lid -->
				<T.Mesh position={[0, bodyH + lidH + 0.005, 0]}>
					<T.SphereGeometry args={[0.0065, 14, 12]} />
					{@render surface(presets['keepsake-box'].finial, VOLUME_CLAY_COLORS.alabaster, 0.84)}
				</T.Mesh>
			</T.Group>
		{:else if prop.kind === 'book-stack'}
			{@const stack = layoutBookStack(prop.books)}
			<T.Group
				name={prop.id}
				position={[prop.position[0], prop.position[1], prop.position[2]]}
			>
				{#each stack.layers as { book, centerY }, index (index)}
					{@const covers = presets['book-stack'].covers}
					{@const stackCover = covers[(index + prop.shelfIndex) % covers.length]}
					{@const boardH = STACK_COVER_THICKNESS}
					<T.Group position={[book.offsetX, centerY, 0]} rotation={[0, book.yaw, 0]}>
						<!-- Bottom cover -->
						<T.Mesh position={[0, -(book.thickness / 2 - boardH / 2), 0]}>
							<T.BoxGeometry args={[book.width, boardH, book.depth]} />
							{@render surface(stackCover, VOLUME_CLAY_COLORS[book.clayTone], 0.9)}
						</T.Mesh>
						<!-- Top cover -->
						<T.Mesh position={[0, book.thickness / 2 - boardH / 2, 0]}>
							<T.BoxGeometry args={[book.width, boardH, book.depth]} />
							{@render surface(stackCover, VOLUME_CLAY_COLORS[book.clayTone], 0.9)}
						</T.Mesh>
						<!-- Spine facing +Z -->
						<T.Mesh position={[0, 0, (book.depth - STACK_SPINE_DEPTH) / 2]}>
							<T.BoxGeometry args={[book.width, book.thickness - boardH * 2, STACK_SPINE_DEPTH]} />
							{@render surface(stackCover, VOLUME_CLAY_COLORS[book.clayTone], 0.9)}
						</T.Mesh>
						<!-- Recessed page block -->
						<T.Mesh position={[0, 0, -0.004]}>
							<T.BoxGeometry
								args={[
									book.width - 0.008,
									book.thickness - boardH * 2,
									book.depth - 0.012
								]}
							/>
							{@render surface(presets['book-stack'].pages, PAGE_BLOCK_CLAY_COLOR, 0.95)}
						</T.Mesh>
					</T.Group>
				{/each}

				{#if prop.topper}
					{#if prop.topper.profile === 'sculpture'}
						<T.Mesh position={[0, getSculptureCenterY(stack.topY, 0.048 * prop.topper.scale), 0]} rotation={[sculptureTilt, 0, 0]}>
							<T.IcosahedronGeometry args={[0.048 * prop.topper.scale, 0]} />
							{@render surface(presets['book-stack'].sculpture, VOLUME_CLAY_COLORS[prop.topper.clayTone], 0.86, true)}
						</T.Mesh>
					{:else if prop.topper.profile === 'hourglass'}
						{@const h = 0.125 * prop.topper.scale}
						{@const r = 0.032 * prop.topper.scale}
						{@const capH = 0.009 * prop.topper.scale}
						{@const innerH = h - capH * 2}
						<T.Group position={[0, stack.topY, 0]}>
							<T.Mesh position={[0, capH / 2, 0]}>
								<T.CylinderGeometry args={[r, r * 1.04, capH, 24]} />
								{@render surface(presets['book-stack'].cap, VOLUME_CLAY_COLORS.charcoal, 0.86)}
							</T.Mesh>
							<T.Mesh position={[0, h - capH / 2, 0]}>
								<T.CylinderGeometry args={[r * 1.04, r, capH, 24]} />
								{@render surface(presets['book-stack'].cap, VOLUME_CLAY_COLORS.charcoal, 0.86)}
							</T.Mesh>
							{#each getHourglassRods(r, h) as position, idx (idx)}
								<T.Mesh {position}>
									<T.CylinderGeometry args={[0.0022, 0.0022, innerH, 8]} />
									{@render surface(presets['book-stack'].rod, VOLUME_CLAY_COLORS.charcoal, 0.84)}
								</T.Mesh>
							{/each}
							<T.Mesh
								geometry={hourglassBulbGeometry}
								position={[0, capH, 0]}
								scale={[r, innerH, r]}
							>
								{@render surface(presets['book-stack'].hourglass, VOLUME_CLAY_COLORS[prop.topper.clayTone], 0.82)}
							</T.Mesh>
						</T.Group>
					{:else}
						<T.Mesh
							geometry={vaseGeometries[prop.topper.profile]}
							position={[0, stack.topY, 0]}
							scale={[prop.topper.scale, prop.topper.scale, prop.topper.scale]}
						>
							{@render surface(presets['book-stack'].bowl, VOLUME_CLAY_COLORS[prop.topper.clayTone], 0.86)}
						</T.Mesh>
					{/if}
				{/if}
			</T.Group>
		{/if}
	{/each}
</T.Group>

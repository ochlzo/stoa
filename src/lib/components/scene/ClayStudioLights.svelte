<script lang="ts">
	import { T } from '@threlte/core';
</script>

<!-- Neutral studio lighting for the Clay geometry pass (ADR 0005) -->
<T.HemisphereLight args={['#ffffff', '#c8c6c2', 1.0]} />
<T.DirectionalLight position={[1.8, 2.8, 2.4]} intensity={1.0} color="#ffffff" />
<T.DirectionalLight position={[-2.0, -0.6, 2.0]} intensity={0.45} color="#f4f6fa" />

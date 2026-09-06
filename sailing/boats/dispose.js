// Models own their GPU resources; shared resources within one model are freed once.
export function disposeModel(root, extraMaterials = []) {
  const geometries = new Set();
  const materials = new Set(extraMaterials);
  const textures = new Set();
  root.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) {
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        materials.add(material);
      }
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value?.isTexture) textures.add(value);
    }
    for (const uniform of Object.values(material.uniforms || {})) {
      if (uniform.value?.isTexture) textures.add(uniform.value);
    }
  }
  for (const resource of [...geometries, ...textures, ...materials]) resource.dispose();
  root.removeFromParent();
  root.clear();
}

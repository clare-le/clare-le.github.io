import * as THREE from '../three.js';

export function createMaterials() {
  const mahoganyMaterial = new THREE.MeshStandardMaterial({
    color: 0x752b14, // Deep polished mahogany
    roughness: 0.28,
    metalness: 0.08,
  });
  const teakDeckMaterial = new THREE.MeshStandardMaterial({
    color: 0x8e3b1c, // Striped teak foredeck
    roughness: 0.32,
    metalness: 0.05,
  });
  const creamStripeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6efe2, // Classic racing pinstripe
    roughness: 0.36,
    metalness: 0.02,
  });
  const hullNavyMaterial = new THREE.MeshStandardMaterial({
    color: 0x163248, // Deep marine navy lower hull
    roughness: 0.42,
    metalness: 0.06,
  });
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f4f8, // Polished chrome metal
    roughness: 0.12,
    metalness: 0.95,
  });
  const goldBrassMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfab34, // Polished brass accents
    roughness: 0.22,
    metalness: 0.88,
  });
  const leatherCockpitMaterial = new THREE.MeshStandardMaterial({
    color: 0xb88955,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const cockpitSideMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b2f22,
    roughness: 0.68,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  const darkCockpitMaterial = new THREE.MeshStandardMaterial({
    color: 0x45251e,
    roughness: 0.8,
    emissive: 0x130806,
    emissiveIntensity: 0.18,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x9bdceb,
    transparent: true,
    opacity: 0.22,
    roughness: 0.14,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  return { mahoganyMaterial, teakDeckMaterial, creamStripeMaterial, hullNavyMaterial, chromeMaterial, goldBrassMaterial, leatherCockpitMaterial, cockpitSideMaterial, darkCockpitMaterial, glassMaterial };
}

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function NeuralNetwork3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Particles — emerald nodes
    const count = 420;
    const positions = new Float32Array(count * 3);
    const nodePositions: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 2.8 + Math.random() * 2.2;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      nodePositions.push(new THREE.Vector3(x, y, z));
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.055,
      color: 0x1fae6e,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Connections — soft mint at low opacity
    const linePositions: number[] = [];
    for (let i = 0; i < count; i++) {
      let linked = 0;
      for (let j = i + 1; j < count; j++) {
        if (linked >= 3) break;
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < 1.15) {
          linePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
          linePositions.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);
          linked++;
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linePositions), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x7ddbb4, transparent: true, opacity: 0.18 });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Secondary blue pathways — subtle depth layer
    const blueLinePositions: number[] = [];
    for (let i = 0; i < count; i += 3) {
      let linked = 0;
      for (let j = i + 2; j < count; j += 2) {
        if (linked >= 2) break;
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist > 1.5 && dist < 2.2) {
          blueLinePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
          blueLinePositions.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);
          linked++;
        }
      }
    }

    const blueLineGeo = new THREE.BufferGeometry();
    blueLineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(blueLinePositions), 3));
    const blueLineMat = new THREE.LineBasicMaterial({ color: 0x4c9be8, transparent: true, opacity: 0.08 });
    const blueLines = new THREE.LineSegments(blueLineGeo, blueLineMat);
    scene.add(blueLines);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0x1fae6e, 0.8);
    pointLight.position.set(8, 8, 8);
    scene.add(pointLight);

    // Mouse orbit
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let frameId: number;
    const startTime = performance.now();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;
      particles.rotation.y = elapsed * 0.045 + mouseX * 0.25;
      particles.rotation.x = Math.sin(elapsed * 0.025) * 0.18 + mouseY * 0.18;
      lines.rotation.y = particles.rotation.y;
      lines.rotation.x = particles.rotation.x;
      blueLines.rotation.y = particles.rotation.y;
      blueLines.rotation.x = particles.rotation.x;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}

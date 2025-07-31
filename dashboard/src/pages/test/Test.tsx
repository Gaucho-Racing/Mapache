import Layout from "@/components/Layout";
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSidebarExpanded, useSidebarWidth } from '@/lib/store';

function Test() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarExpanded = useSidebarExpanded();
  const sidebarWidth = useSidebarWidth();
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    cube?: THREE.Mesh;
    geometry?: THREE.BoxGeometry;
    material?: THREE.MeshBasicMaterial;
    animationId?: number;
  }>({});

  const createScene = () => {
    console.log("attempt to create a scene", {
      cRef : canvasRef.current, 
      sR : sceneRef.current.scene
    });
    if (!canvasRef.current || sceneRef.current.scene) return;

    const canvas = canvasRef.current;
    console.log('Creating Three.js scene...');
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x222222);

    // Add a simple cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      cube,
      geometry,
      material
    };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current.scene || !sceneRef.current.cube || !sceneRef.current.renderer) return;
      
      sceneRef.current.animationId = requestAnimationFrame(animate);
      sceneRef.current.cube.rotation.x += 0.01;
      sceneRef.current.cube.rotation.y += 0.01;
      sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera!);
    };
    animate();
  };

  const destroyScene = () => {
    if (!sceneRef.current.scene) return;

    console.log('Destroying Three.js scene...');
    
    // Cancel animation
    if (sceneRef.current.animationId) {
      cancelAnimationFrame(sceneRef.current.animationId);
    }

    // Dispose resources
    if (sceneRef.current.geometry) {
      sceneRef.current.geometry.dispose();
    }
    if (sceneRef.current.material) {
      sceneRef.current.material.dispose();
    }
    if (sceneRef.current.renderer) {
      sceneRef.current.renderer.dispose();
    }

    // Clear references
    sceneRef.current = {};
  };

  // Visibility change listener with Three.js management
  useEffect(() => {
    const instanceId = Math.random().toString(36).substr(2, 9);
    
    const handleVisibilityChange = () => {
      console.log(`[${instanceId}] Page visibility changed:`, {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString()
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Log initial state and create scene if visible
    console.log(`[${instanceId}] Initial page visibility:`, {
      hidden: document.hidden,
      visibilityState: document.visibilityState,
      timestamp: new Date().toISOString()
    });

    // Create scene initially if page is visible
    if (!document.hidden) {
      // Use setTimeout to ensure canvas is mounted before creating scene
      setTimeout(() => {
        console.log("Delayed scene creation attempt");
        createScene();
      }, 1000);
    }

    return () => {
      console.log(`[${instanceId}] Cleaning up visibility listener`);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      destroyScene();
    };
  }, []);

  const handleResize = () => {
    console.log('handleResize called', {
      hasCanvas: !!canvasRef.current,
      hasRenderer: !!sceneRef.current.renderer,
      hasCamera: !!sceneRef.current.camera,
      hasScene: !!sceneRef.current.scene
    });

    if (!canvasRef.current || !sceneRef.current.renderer || !sceneRef.current.camera || !sceneRef.current.scene) {
      console.log('Skipping resize - missing references');
      return;
    }

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    
    if (!container) {
      console.log('Skipping resize - no container');
      return;
    }

    // Get the actual container dimensions
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Skip if dimensions are invalid
    if (width <= 0 || height <= 0) {
      console.log('Skipping resize - invalid dimensions', { width, height });
      return;
    }

    console.log('Performing resize:', { 
      width, 
      height, 
      canvasClientWidth: canvas.clientWidth,
      canvasClientHeight: canvas.clientHeight
    });

    // Update camera aspect ratio
    sceneRef.current.camera.aspect = width / height;
    sceneRef.current.camera.updateProjectionMatrix();

    // Update renderer size to match container
    sceneRef.current.renderer.setSize(width, height);
    
    // Force canvas to match container size
    canvas.width = width;
    canvas.height = height;
  };

  // Separate effect to handle initial canvas mounting
  useEffect(() => {
    if (canvasRef.current && !document.hidden && !sceneRef.current.scene) {
      console.log("Canvas is now available, creating scene");
      createScene();
    }
  }, [canvasRef.current]);

  // Window resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    
    // Also listen for any container size changes using ResizeObserver
    let resizeObserver: ResizeObserver | null = null;
    
    if (canvasRef.current && canvasRef.current.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        console.log('Canvas container resized');
        handleResize();
      });
      
      // Observe the container div, not the canvas
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [sceneRef.current.renderer]); // Re-run when renderer changes

  // Sidebar resize listener - triggers when sidebar expands/collapses
  useEffect(() => {
    console.log('Sidebar state changed:', { 
      expanded: sidebarExpanded, 
      width: sidebarWidth,
      hasScene: !!sceneRef.current.scene
    });
    
    // Only resize if we have a scene to resize
    if (!sceneRef.current.scene) {
      console.log('Skipping sidebar resize - no scene exists');
      return;
    }
    
    // Add a small delay to allow the layout to settle after sidebar change
    const timeoutId = setTimeout(() => {
      console.log('Executing delayed sidebar resize...');
      handleResize();
    }, 1000); // 1000ms should be enough for CSS transitions

    return () => clearTimeout(timeoutId);
  }, [sidebarExpanded, sidebarWidth]); // Trigger when sidebar state changes

  return (
    <>
      <Layout activeTab="test" headerTitle="Test">
        <div className="flex flex-col justify-start">
          <div style={{ width: '100%', height: '60vh', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#222222',
                border: '1px solid #444',
                display: 'block'
              }}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}

export default Test;

import Layout from "@/components/Layout";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useSidebarExpanded, useSidebarWidth } from "@/lib/store";

function Test() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarExpanded = useSidebarExpanded();
  const sidebarWidth = useSidebarWidth();

  // Track clicked objects with their data
  const [clickedObjects, setClickedObjects] = useState<
    Array<{
      id: string;
      name: string;
      color: string;
      timestamp: Date;
      type: string;
    }>
  >([]);

  const mouseRef = useRef({
    isDown: false,
    lastX: 0,
    lastY: 0,
    isOverCube: false,
    isHighlighted: false,
    currentObject: null as {
      id: string;
      mesh: THREE.Mesh;
      material: THREE.MeshBasicMaterial;
      highlightMaterial: THREE.MeshBasicMaterial;
      name: string;
      type: string;
    } | null,
  });
  const raycastRef = useRef({
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  });
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    objects?: Array<{
      id: string;
      mesh: THREE.Mesh;
      material: THREE.MeshBasicMaterial;
      highlightMaterial: THREE.MeshBasicMaterial;
      name: string;
      type: string;
    }>;
    animationId?: number;
  }>({});

  const createScene = () => {
    console.log("attempt to create a scene", {
      cRef: canvasRef.current,
      sR: sceneRef.current.scene,
    });
    if (!canvasRef.current || sceneRef.current.scene) return;

    const canvas = canvasRef.current;
    console.log("Creating Three.js scene...");

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ canvas });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x222222);

    // Create multiple objects
    const objects: Array<{
      id: string;
      mesh: THREE.Mesh;
      material: THREE.MeshBasicMaterial;
      highlightMaterial: THREE.MeshBasicMaterial;
      name: string;
      type: string;
    }> = [];

    // Add a cube
    const cubeGeometry = new THREE.BoxGeometry();
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cubeHighlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(-2, 0, 0);
    scene.add(cube);

    objects.push({
      id: "cube-1",
      mesh: cube,
      material: cubeMaterial,
      highlightMaterial: cubeHighlightMaterial,
      name: "Green Cube",
      type: "cube",
    });

    // Add a sphere
    const sphereGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphereHighlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.7,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(2, 0, 0);
    scene.add(sphere);

    objects.push({
      id: "sphere-1",
      mesh: sphere,
      material: sphereMaterial,
      highlightMaterial: sphereHighlightMaterial,
      name: "Red Sphere",
      type: "sphere",
    });

    // Add a cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32);
    const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const cylinderHighlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.7,
    });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(0, 0, 0);
    scene.add(cylinder);

    objects.push({
      id: "cylinder-1",
      mesh: cylinder,
      material: cylinderMaterial,
      highlightMaterial: cylinderHighlightMaterial,
      name: "Blue Cylinder",
      type: "cylinder",
    });

    camera.position.z = 5;

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      objects,
    };

    // Raycasting function to check if mouse is over any object
    const updateRaycast = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();

      // Convert mouse coordinates to normalized device coordinates (-1 to +1)
      raycastRef.current.mouse.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;
      raycastRef.current.mouse.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycastRef.current.raycaster.setFromCamera(
        raycastRef.current.mouse,
        camera,
      );

      // Check for intersections with all objects
      const allMeshes = objects.map((obj) => obj.mesh);
      const intersects =
        raycastRef.current.raycaster.intersectObjects(allMeshes);

      if (intersects.length > 0) {
        // Find which object was intersected
        const intersectedMesh = intersects[0].object;
        const intersectedObject = objects.find(
          (obj) => obj.mesh === intersectedMesh,
        );

        if (intersectedObject && !mouseRef.current.isOverCube) {
          mouseRef.current.isOverCube = true;
          mouseRef.current.currentObject = intersectedObject;
          canvas.style.cursor = "grab";
        }
      } else {
        if (mouseRef.current.isOverCube) {
          mouseRef.current.isOverCube = false;
          mouseRef.current.currentObject = null;
          canvas.style.cursor = "default";
        }
      }
    };

    // Mouse event handlers
    const handleMouseDown = (event: MouseEvent) => {
      if (!mouseRef.current.isOverCube || !mouseRef.current.currentObject)
        return;

      const currentObj = mouseRef.current.currentObject;

      if (event.button === 0) {
        // Left mouse button
        // Toggle highlight
        mouseRef.current.isHighlighted = !mouseRef.current.isHighlighted;
        if (mouseRef.current.isHighlighted) {
          currentObj.mesh.material = currentObj.highlightMaterial;
        } else {
          currentObj.mesh.material = currentObj.material;
        }

        // Add the clicked object to the list
        setClickedObjects((prev) => {
          // Check if object already exists to avoid duplicates
          const exists = prev.some((obj) => obj.id === currentObj.id);
          if (!exists) {
            return [
              ...prev,
              {
                id: currentObj.id,
                name: currentObj.name,
                color: `#${currentObj.material.color.getHexString()}`,
                timestamp: new Date(),
                type: currentObj.type,
              },
            ];
          }
          return prev;
        });
      } else if (event.button === 2) {
        // Right mouse button
        event.preventDefault(); // Prevent context menu

        mouseRef.current.isDown = true;
        mouseRef.current.lastX = event.clientX;
        mouseRef.current.lastY = event.clientY;
        canvas.style.cursor = "grabbing";

        // Don't change highlight state on right click
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Always update raycast to check hover state (but only when not dragging)
      if (!mouseRef.current.isDown) {
        updateRaycast(event);
      }

      // If we're dragging, rotate the current object
      if (mouseRef.current.isDown && mouseRef.current.currentObject) {
        const deltaX = event.clientX - mouseRef.current.lastX;
        const deltaY = event.clientY - mouseRef.current.lastY;

        // Rotate current object based on mouse movement
        mouseRef.current.currentObject.mesh.rotation.y += deltaX * 0.01;
        mouseRef.current.currentObject.mesh.rotation.x += deltaY * 0.01;

        mouseRef.current.lastX = event.clientX;
        mouseRef.current.lastY = event.clientY;
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      mouseRef.current.isDown = false;

      // Preserve highlight state for current object
      if (mouseRef.current.currentObject) {
        if (mouseRef.current.isHighlighted) {
          mouseRef.current.currentObject.mesh.material =
            mouseRef.current.currentObject.highlightMaterial;
        } else {
          mouseRef.current.currentObject.mesh.material =
            mouseRef.current.currentObject.material;
        }
      }

      // Check raycast state after releasing mouse to update cursor
      updateRaycast(event);

      if (mouseRef.current.isOverCube) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "default";
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.isDown = false;
      mouseRef.current.isOverCube = false;

      // Preserve highlight state for current object when leaving canvas
      if (mouseRef.current.currentObject) {
        if (mouseRef.current.isHighlighted) {
          mouseRef.current.currentObject.mesh.material =
            mouseRef.current.currentObject.highlightMaterial;
        } else {
          mouseRef.current.currentObject.mesh.material =
            mouseRef.current.currentObject.material;
        }
      }

      mouseRef.current.currentObject = null;
      canvas.style.cursor = "default";
    };

    // Prevent context menu on right click
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    // Add event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("contextmenu", handleContextMenu);

    // Set initial cursor
    canvas.style.cursor = "default";

    // Animation loop (just rendering, no automatic rotation)
    const animate = () => {
      if (
        !sceneRef.current.scene ||
        !sceneRef.current.objects ||
        !sceneRef.current.renderer
      )
        return;

      sceneRef.current.animationId = requestAnimationFrame(animate);
      sceneRef.current.renderer.render(
        sceneRef.current.scene,
        sceneRef.current.camera!,
      );
    };
    animate();

    // Store cleanup function for mouse events
    (sceneRef.current as any).cleanupMouse = () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("contextmenu", handleContextMenu);

      // Reset mouse state
      mouseRef.current.isDown = false;
      mouseRef.current.isOverCube = false;
    };
  };

  const destroyScene = () => {
    if (!sceneRef.current.scene) return;

    console.log("Destroying Three.js scene...");

    // Cancel animation
    if (sceneRef.current.animationId) {
      cancelAnimationFrame(sceneRef.current.animationId);
    }

    // Cleanup mouse events
    if ((sceneRef.current as any).cleanupMouse) {
      (sceneRef.current as any).cleanupMouse();
    }

    // Dispose resources for all objects
    if (sceneRef.current.objects) {
      sceneRef.current.objects.forEach((obj) => {
        if (obj.mesh.geometry) {
          obj.mesh.geometry.dispose();
        }
        if (obj.material) {
          obj.material.dispose();
        }
        if (obj.highlightMaterial) {
          obj.highlightMaterial.dispose();
        }
      });
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
        timestamp: new Date().toISOString(),
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Log initial state and create scene if visible
    console.log(`[${instanceId}] Initial page visibility:`, {
      hidden: document.hidden,
      visibilityState: document.visibilityState,
      timestamp: new Date().toISOString(),
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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      destroyScene();
    };
  }, []);

  const handleResize = () => {
    console.log("handleResize called", {
      hasCanvas: !!canvasRef.current,
      hasRenderer: !!sceneRef.current.renderer,
      hasCamera: !!sceneRef.current.camera,
      hasScene: !!sceneRef.current.scene,
    });

    if (
      !canvasRef.current ||
      !sceneRef.current.renderer ||
      !sceneRef.current.camera ||
      !sceneRef.current.scene
    ) {
      console.log("Skipping resize - missing references");
      return;
    }

    const canvas = canvasRef.current;
    const container = canvas.parentElement;

    if (!container) {
      console.log("Skipping resize - no container");
      return;
    }

    // Get the actual container dimensions
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Skip if dimensions are invalid
    if (width <= 0 || height <= 0) {
      console.log("Skipping resize - invalid dimensions", { width, height });
      return;
    }

    console.log("Performing resize:", {
      width,
      height,
      canvasClientWidth: canvas.clientWidth,
      canvasClientHeight: canvas.clientHeight,
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
    window.addEventListener("resize", handleResize);

    // Also listen for any container size changes using ResizeObserver
    let resizeObserver: ResizeObserver | null = null;

    if (canvasRef.current && canvasRef.current.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        console.log("Canvas container resized");
        handleResize();
      });

      // Observe the container div, not the canvas
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [sceneRef.current.renderer]); // Re-run when renderer changes

  // Sidebar resize listener - triggers when sidebar expands/collapses
  useEffect(() => {
    console.log("Sidebar state changed:", {
      expanded: sidebarExpanded,
      width: sidebarWidth,
      hasScene: !!sceneRef.current.scene,
    });

    // Only resize if we have a scene to resize
    if (!sceneRef.current.scene) {
      console.log("Skipping sidebar resize - no scene exists");
      return;
    }

    // Add a small delay to allow the layout to settle after sidebar change
    const timeoutId = setTimeout(() => {
      console.log("Executing delayed sidebar resize...");
      handleResize();
    }, 1000); // 1000ms should be enough for CSS transitions

    return () => clearTimeout(timeoutId);
  }, [sidebarExpanded, sidebarWidth]); // Trigger when sidebar state changes

  const removeClickedObject = (id: string) => {
    setClickedObjects((prev) => prev.filter((obj) => obj.id !== id));
  };

  return (
    <>
      <Layout activeTab="test" headerTitle="Test">
        <div className="flex h-full flex-col justify-start">
          <div style={{ width: "100%", height: "60vh", position: "relative" }}>
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#222222",
                border: "1px solid #444",
                display: "block",
              }}
            />
          </div>
          {clickedObjects.length > 0 && (
            <div
              style={{
                width: "100%",
                height: "40vh",
                backgroundColor: "#333333",
                border: "1px solid #666",
                padding: "20px",
                color: "white",
                overflowY: "auto",
              }}
            >
              <h2 style={{ margin: "0 0 15px 0", fontSize: "24px" }}>
                Clicked Objects ({clickedObjects.length})
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {clickedObjects.map((obj) => (
                  <div
                    key={obj.id}
                    style={{
                      backgroundColor: "#444",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid #666",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: "0 0 5px 0", fontSize: "18px" }}>
                        {obj.name}
                      </h3>
                      <p
                        style={{
                          margin: "0 0 5px 0",
                          fontSize: "14px",
                          opacity: 0.8,
                        }}
                      >
                        Type: {obj.type} | Color: {obj.color}
                      </p>
                      <p
                        style={{ margin: "0", fontSize: "12px", opacity: 0.6 }}
                      >
                        Clicked: {obj.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeClickedObject(obj.id)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#555",
                        color: "white",
                        border: "1px solid #777",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setClickedObjects([])}
                style={{
                  marginTop: "15px",
                  padding: "10px 20px",
                  backgroundColor: "#666",
                  color: "white",
                  border: "1px solid #888",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

export default Test;

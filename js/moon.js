/* A small WebGL globe. Modern LRO colour data, never labelled as 1964 photography. */
(() => {
  "use strict";

  function create(canvas, {
    interactive = false,
    distance = 3.2
  } = {}) {
    if (!canvas) return null;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true
    });
    if (!gl) return fallback(canvas, {
      interactive,
      distance
    });

    let destroyed = false;
    let imageLoaded = false;
    let rotation = 0;
    let dragging = false;
    let lastX = 0;
    let cameraDistance = distance;
    const vertexSource = `
      attribute vec2 position;
      varying vec2 screenPosition;
      void main() {
        screenPosition = position;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec2 screenPosition;
      uniform float aspect;
      uniform float cameraDistance;
      uniform float rotation;
      uniform sampler2D moonTexture;
      void main() {
        vec3 origin = vec3(0.0, 0.0, cameraDistance);
        vec3 ray = normalize(vec3(screenPosition.x * aspect, screenPosition.y, -1.9));
        float b = dot(origin, ray);
        float c = dot(origin, origin) - 1.0;
        float discriminant = b * b - c;
        if (discriminant < 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }
        float t = -b - sqrt(discriminant);
        vec3 normal = normalize(origin + ray * t);
        float longitude = atan(normal.x, normal.z) + rotation;
        float latitude = asin(clamp(normal.y, -1.0, 1.0));
        vec2 uv = vec2(fract(0.5 + longitude / 6.2831853), 0.5 + latitude / 3.14159265);
        vec3 colour = texture2D(moonTexture, uv).rgb;
        vec3 light = normalize(vec3(-0.7, 0.65, 1.4));
        float diffuse = max(dot(normal, light), 0.0);
        colour *= 0.11 + 0.98 * diffuse;
        gl_FragColor = vec4(colour, 1.0);
      }
    `;

    function shader(type, source) {
      const result = gl.createShader(type);
      gl.shaderSource(result, source);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        gl.deleteShader(result);
        return null;
      }
      return result;
    }

    const vertex = shader(gl.VERTEX_SHADER, vertexSource);
    const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return fallback(canvas, {
      interactive,
      distance
    });
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fallback(canvas, {
      interactive,
      distance
    });
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const aspectUniform = gl.getUniformLocation(program, "aspect");
    const distanceUniform = gl.getUniformLocation(program, "cameraDistance");
    const rotationUniform = gl.getUniformLocation(program, "rotation");
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.clearColor(0, 0, 0, 0);

    const image = new Image();
    image.onload = () => {
      if (destroyed) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        imageLoaded = true;
        render();
      } catch (error) {
        // Local file URLs may restrict WebGL texture upload. The book still works.
        canvas.style.background = `center / contain no-repeat url("${window.EBA_IMAGES.r7_b001_primera.src}")`;
      }
    };
    image.src = window.EBA_MOON_TEXTURE || window.EBA_IMAGES.moon_lro_texture.src;

    function render(newDistance = cameraDistance) {
      if (destroyed) return;
      cameraDistance = newDistance;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!imageLoaded) return;
      gl.useProgram(program);
      gl.uniform1f(aspectUniform, width / height);
      gl.uniform1f(distanceUniform, cameraDistance);
      gl.uniform1f(rotationUniform, rotation);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function down(event) {
      if (!interactive) return;
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    }

    function move(event) {
      if (!dragging) return;
      rotation += (event.clientX - lastX) * .008;
      lastX = event.clientX;
      render();
    }

    function up() {
      dragging = false;
    }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const resize = new ResizeObserver(() => render());
    resize.observe(canvas);
    if (interactive) canvas.style.touchAction = "pan-y";

    return {
      render,
      destroy() {
        destroyed = true;
        resize.disconnect();
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        const release = gl.getExtension("WEBGL_lose_context");
        if (release) release.loseContext();
      }
    };
  }

  function fallback(canvas, {
    interactive = false,
    distance = 3.2
  } = {}) {
    // The same spherical projection rendered on the CPU when WebGL is unavailable.
    // This keeps the 3D approach available on browsers without GPU support.
    const context = canvas.getContext("2d", {
      alpha: true
    });
    if (!context) return {
      render() {},
      destroy() {}
    };
    let destroyed = false;
    let pixels = null;
    let cameraDistance = distance;
    let rotation = 0;
    let dragging = false;
    let previousX = 0;
    let textureWidth = 0;
    let textureHeight = 0;
    const texture = new Image();
    texture.onload = () => {
      if (destroyed) return;
      try {
        const offscreen = document.createElement("canvas");
        offscreen.width = texture.width;
        offscreen.height = texture.height;
        const textureContext = offscreen.getContext("2d");
        textureContext.drawImage(texture, 0, 0);
        pixels = textureContext.getImageData(0, 0, texture.width, texture.height).data;
        textureWidth = texture.width;
        textureHeight = texture.height;
        render();
      } catch (error) {
        canvas.style.background = `center / contain no-repeat url("${window.EBA_IMAGES.r7_b001_primera.src}")`;
        canvas.setAttribute("aria-label",
          "Historic Ranger 7 photograph. Enable a local web server for the 3D globe.");
      }
    };
    texture.src = window.EBA_MOON_TEXTURE || window.EBA_IMAGES.moon_lro_texture.src;

    function render(newDistance = cameraDistance) {
      if (destroyed || !pixels) return;
      cameraDistance = newDistance;
      const rect = canvas.getBoundingClientRect();
      const width = Math.min(520, Math.max(2, Math.round(rect.width)));
      const height = Math.max(2, Math.round(width * rect.height / Math.max(1, rect.width)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const image = context.createImageData(width, height);
      const aspect = width / height;
      const lightLength = Math.hypot(-.7, .65, 1.4);
      const lx = -.7 / lightLength;
      const ly = .65 / lightLength;
      const lz = 1.4 / lightLength;
      for (let y = 0; y < height; y += 1) {
        const screenY = 1 - (y + .5) / height * 2;
        for (let x = 0; x < width; x += 1) {
          const screenX = ((x + .5) / width * 2 - 1) * aspect;
          const inverseLength = 1 / Math.hypot(screenX, screenY, 1.9);
          const rx = screenX * inverseLength;
          const ry = screenY * inverseLength;
          const rz = -1.9 * inverseLength;
          const b = cameraDistance * rz;
          const discriminant = b * b - (cameraDistance * cameraDistance - 1);
          if (discriminant < 0) continue;
          const t = -b - Math.sqrt(discriminant);
          const nx = rx * t;
          const ny = ry * t;
          const nz = cameraDistance + rz * t;
          const u = ((.5 + (Math.atan2(nx, nz) + rotation) / (2 * Math.PI)) % 1 + 1) % 1;
          const v = .5 - Math.asin(Math.max(-1, Math.min(1, ny))) / Math.PI;
          const tx = Math.min(textureWidth - 1, Math.floor(u * textureWidth));
          const ty = Math.min(textureHeight - 1, Math.floor(v * textureHeight));
          const source = (ty * textureWidth + tx) * 4;
          const target = (y * width + x) * 4;
          const light = .11 + .98 * Math.max(0, nx * lx + ny * ly + nz * lz);
          image.data[target] = Math.min(255, pixels[source] * light);
          image.data[target + 1] = Math.min(255, pixels[source + 1] * light);
          image.data[target + 2] = Math.min(255, pixels[source + 2] * light);
          image.data[target + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
    }

    function down(event) {
      if (!interactive) return;
      dragging = true;
      previousX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    }

    function move(event) {
      if (!dragging) return;
      rotation += (event.clientX - previousX) * .008;
      previousX = event.clientX;
      render();
    }

    function up() {
      dragging = false;
    }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const resize = new ResizeObserver(() => render());
    resize.observe(canvas);
    return {
      render,
      destroy() {
        destroyed = true;
        resize.disconnect();
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
      }
    };
  }

  window.EBA_MOON = {
    create
  };
})();

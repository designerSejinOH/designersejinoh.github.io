
let font;
let tex, theShader;
function preload() {
  font = loadFont('Helvetica.otf');
}

function setup() {
	createCanvas(windowWidth, windowHeight, WEBGL); 
	// Shaders require WEBGL
	background(0);

	pixelDensity(1); // fixes retina display offset
	setAttributes('antialias', true); // toggle depending on display / performance

	// create 2D/3D layer for graphics being passed into shader
	tex = createGraphics(width, height);
	tex.background(0);

	// load vert/frag defined below
	theShader = createShader(vertShader, fragShader);
}


function draw() {
	// draw on 'tex', which is passed into shader
	tex.texFont(font);
	tex.noFill();
	tex.stroke(255);
	let y = random(tex.height)	// text
	tex.fill(255);
	tex.textSize(tex.width / 10);
	tex.textAlign(CENTER, CENTER);
	tex.text("designersejinoh", tex.width / 2, tex.height / 2);

	// pass required uniforms to our shader (don't change)
	theShader.setUniform("resolution", [width, height]);
	theShader.setUniform('tInput', tex);
	theShader.setUniform("max_distort", abs(sin(frameCount * .001) * 10));
	theShader.setUniform("iMouse", [map(mouseX, 0, width, 0, 1), map(mouseY, 0, height, 0, 1)]);
	theShader.setUniform("num_iter", 12);
	theShader.setUniform("focalDistance", 42.0);
	theShader.setUniform("aperture", 12.0);

	// set + display shader
	shader(theShader); // apply shader
	rect(0, 0, width, height); // display shader
}

/* SHADER DEFINITIONS */

let vertShader = `
	attribute vec3 aPosition;
	attribute vec2 aTexCoord;
	
	varying vec2 vTexCoord;
	
	void main() {
	  vTexCoord = aTexCoord;
	
	  vec4 positionVec4 = vec4(aPosition, 1.0);
	  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
	
	  gl_Position = positionVec4;
	}
`;


let fragShader = `
	#ifdef GL_ES
	precision mediump float;
	#endif
	
	uniform sampler2D tInput;
	uniform vec2 resolution;
	uniform float max_distort;
	uniform vec2 iMouse;
	
	vec2 barrelDistortion(vec2 coord, float amt) {
		vec2 cc = coord - iMouse;
		float dist = dot(cc, cc);
		return coord + cc * dist * amt;
	}
	
	float sat( float t )
	{
		return clamp( t, 0.0, 1.0 );
	}
	
	float linterp( float t ) {
		return sat( 1.0 - abs( 2.0*t - 1.0 ) );
	}
	
	float remap( float t, float a, float b ) {
		return sat( (t - a) / (b - a) );
	}
	
	vec4 spectrum_offset( float t ) {
		vec4 ret;
		float lo = step(t,0.5);
		float hi = 1.0-lo;
		float w = linterp( remap( t, 1.0/6.0, 5.0/6.0 ) );
		ret = vec4(lo,1.0,hi, 1.) * vec4(1.0-w, w, 1.0-w, 1.);
	
		return pow( ret, vec4(1.0/2.2) );
	}
	
	const int num_iter = 37;
	
	void main()
	{	
		vec2 uv=(gl_FragCoord.xy/resolution.xy*1.0)+.0;
		uv.y = 1.0 - uv.y;
		
		float reci_num_iter_f = 1.0 / float(num_iter);
		vec4 sumcol = vec4(0.0);
		vec4 sumw = vec4(0.0);	
		for ( int i=0; i<num_iter;++i )
		{
			float t = float(i) * reci_num_iter_f;
			vec4 w = spectrum_offset( t );
			sumw += w;
			sumcol += w * texture2D( tInput, barrelDistortion(uv, .16 * max_distort*t ) );
		}
			
		gl_FragColor = sumcol / sumw;
	}
`;
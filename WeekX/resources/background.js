#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
void main(){
    vec2 r=u_resolution, p=gl_FragCoord.xy/r.xy*2.-1.;
    p.x*=r.x/r.y;
    float i=floor(mod(atan(p.y,p.x)+6.283,6.283)/.785);
    float t=mod(u_time,4.6), s=i*.15, 
          m=smoothstep(s,s+.6,t)-smoothstep(s+2.3,s+2.9,t);
    vec3 color = .5 + .5 * cos(u_time + vec3(0,2,4));
    gl_FragColor=vec4(color * smoothstep(.41,.39,length(p-normalize(p)*m*1.2)), 1.);
}
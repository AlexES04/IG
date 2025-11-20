#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
void main(){
    vec2 r=u_resolution, p=(gl_FragCoord.xy*2.-r)/r.y;
    float l=length(p), 
          a=abs(mod(atan(p.y,p.x)+u_time*.5, 2.09)-1.05);
    float m=max(smoothstep(.52,.51,a)*smoothstep(.19,.2,l)*smoothstep(.8,.79,l),
                smoothstep(.125,.115,l));
    gl_FragColor=vec4(mix(vec3(.95,.8,0),vec3(.1),m),1);
}
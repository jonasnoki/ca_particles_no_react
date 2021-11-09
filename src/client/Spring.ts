import {
    BufferAttribute,
    BufferGeometry, Cache, Color,
    Line,
    LineBasicMaterial,
    Material,
    Vector3,
} from 'three'
import { SpringParticle } from './SpringParticle'
import enabled = Cache.enabled


export class Spring {
    private enabled = true;
    private particleA: SpringParticle
    private particleB: SpringParticle
    private elasticity: number
    private damping: number
    private restingDist: number
    public type: "normal" | "shear" | "bend";
    private mesh: Line
    private showSpring: boolean
    private positionArray: Float32Array;
    private positionBuffer: BufferAttribute;
    private geometry = new BufferGeometry()
    private static material = new LineBasicMaterial({
        color: 0xff0000,
    })

    constructor(particleA: SpringParticle, particleB: SpringParticle, elasticity: number, damping: number, showSpring: boolean, type: "normal" | "shear" | "bend" = "normal") {
        this.particleA = particleA
        this.particleB = particleB
        this.elasticity = elasticity
        this.damping = damping
        this.showSpring = showSpring
        this.type = type
        this.restingDist = this.particleA.getCurrentPosition().clone().sub(this.particleB.getCurrentPosition()).length()
        const material = Spring.material.clone();
        if (type === "normal"){
            material.linewidth = 2;
        } else if (type === "shear"){
            material.color = new Color(0x00ff00);
        } else if (type === "bend"){
            material.color = new Color(0x0000ff);
        }
        this.mesh = new Line(this.geometry, material);
        const pA = this.particleA.getCurrentPosition();
        const pB = this.particleB.getCurrentPosition();
        this.positionArray = new Float32Array([pA.x, pA.y, pA.z, pB.x, pB.y, pB.z]);
        this.positionBuffer =  new BufferAttribute(this.positionArray, 3)
        this.geometry.setAttribute('position', this.positionBuffer);
        this.mesh.visible = this.showSpring;
    }

    public setElasticity(e: number) {
        this.elasticity = e
    }

    public setDamping(d: number) {
        this.damping = d
    }

    public setShowSpring(s: boolean) {
        this.showSpring = s
        this.mesh.visible = s && this.enabled;
    }

    public setEnabled(s: boolean, type: "normal" | "shear" | "bend" = "normal") {
        if(this.type !== type) return;
        this.enabled = s;
        this.mesh.visible = this.enabled && this.showSpring;
    }

    public calcForce(particle: SpringParticle): Vector3 {
        if(!this.enabled) return new Vector3(0,0,0);
        const pA = this.particleA.getCurrentPosition().clone()
        const pB = this.particleB.getCurrentPosition().clone()

        if (this.showSpring) {
            this.positionArray[0] = pA.x;
            this.positionArray[1] = pA.y;
            this.positionArray[2] = pA.z;
            this.positionArray[3] = pB.x;
            this.positionArray[4] = pB.y;
            this.positionArray[5] = pB.z;
            this.positionBuffer.needsUpdate = true;
        }
        const pbpa = pB.sub(pA)
        const dist = pbpa.length()
        pbpa.normalize()
        const vbva: Vector3 = this.particleB.getVelocity().clone().sub(this.particleA.getVelocity())
        const force = pbpa.multiplyScalar(this.elasticity * (dist - this.restingDist) + this.damping * vbva.dot(pbpa))
        return particle === this.particleA ? force : force.negate()
    }

    public getMesh(): Line {
        return this.mesh

    }

    public delete() {
        this.mesh.geometry.dispose()
        if (this.mesh.material instanceof Material) {
            this.mesh.material.dispose()
        }
        this.mesh.parent?.remove(this.mesh)
    }
}
import {
    BufferAttribute,
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Material,
    Vector3,
} from 'three'
import { SpringParticle } from './SpringParticle'


export class Spring {
    private particleA: SpringParticle
    private particleB: SpringParticle
    private elasticity: number
    private damping: number
    private restingDist: number
    public type: "normal" | "shear" | "bend";
    private mesh: Line
    private showSpring: boolean
    private positionBuffer: BufferAttribute;

    private geometry = new BufferGeometry()
    private static material = new LineBasicMaterial({
        color: 0xfaf0be,
    })

    constructor(particleA: SpringParticle, particleB: SpringParticle, elasticity: number, damping: number, showSpring: boolean, type: "normal" | "shear" | "bend" = "normal") {
        this.particleA = particleA
        this.particleB = particleB
        this.elasticity = elasticity
        this.damping = damping
        this.showSpring = showSpring
        this.type = type
        this.restingDist = this.particleA.getCurrentPosition().clone().sub(this.particleB.getCurrentPosition()).length()
        this.mesh = new Line(this.geometry, Spring.material)
        const pA = this.particleA.getCurrentPosition();
        const pB = this.particleB.getCurrentPosition();
        this.positionBuffer =  new BufferAttribute(new Float32Array([pA.x, pA.y, pA.z, pB.x, pB.y, pB.z]), 3)
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
        this.particleA.getMesh().visible = !s
        this.particleB.getMesh().visible = !s
        this.showSpring = s
        this.mesh.visible = s
    }

    public calcForce(particle: SpringParticle): Vector3 {
        const pA = this.particleA.getCurrentPosition().clone()
        const pB = this.particleB.getCurrentPosition().clone()

        if (this.showSpring) {
            this.positionBuffer.setXYZ(0, pA.x, pA.y, pA.z);
            this.positionBuffer.setXYZ(1, pB.x, pB.y, pB.z);
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
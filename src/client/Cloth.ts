import { Vector3 } from 'three'
import { SpringParticle } from './SpringParticle'
import { Spring } from './Spring'

export class Cloth {
    private fixed: boolean
    private particles: SpringParticle[][] = []
    private springs: Spring[] = []
    private fixedParticles: SpringParticle[] = []
    private fixedParticlesPositions: Vector3[] = []

    constructor(lifetime: number, bouncing: number, elasticity: number, damping: number,  shearElasticity: number, shearDamping: number, bendElasticity: number, bendDamping: number, fixed: boolean, showSpring: boolean, startPosition: Vector3, numberOfRows = 50, numberOfColumns = numberOfRows, fixedIndices: Number[] = []) {
        const mass = 1 / (numberOfColumns * numberOfRows)
        const directionX = new Vector3((1 / numberOfColumns * 10) - (0.5 / numberOfColumns * 10), 0, 0)
        const directionY = new Vector3(0, 0,(1 / numberOfRows * 10) - (0.5 / numberOfRows * 10)).negate()

        this.fixed = fixed

        for (let i = 0; i <= numberOfColumns; i++) {
            this.particles[i] = []
        }

        for (let i = 0; i < numberOfColumns; i++) {
            for (let j = 0; j < numberOfRows; j++) {
                const pos = startPosition.clone().addScaledVector(directionX, j).addScaledVector(directionY, i)
                const curr = new SpringParticle(pos.x, pos.y, pos.z, bouncing, lifetime, mass)
                curr.setMass(mass)
                curr.getMesh().visible = !showSpring
                if (fixedIndices.includes(i * numberOfColumns + j)) {
                    this.fixedParticles.push(curr)
                    this.fixedParticlesPositions.push(new Vector3(pos.x, pos.y, pos.z));
                    curr.setFixed(fixed)
                }

                // Add stretch springs
                if (i > 0) this.createSpring(this.particles[i - 1][j], curr, elasticity, damping, showSpring)
                if (j > 0) this.createSpring(this.particles[i][j - 1], curr, elasticity, damping, showSpring)

                // Add shear springs
                if (i > 1 && j > 1) this.createSpring(this.particles[i - 2][j - 2], curr, shearElasticity, shearDamping, showSpring, "shear")
                if (i > 1 && j > 1) this.createSpring(this.particles[i - 2][j], this.particles[i][j - 2],  shearElasticity, shearDamping,showSpring, "shear")

                // Add bend springs
                if (i > 1) this.createSpring(this.particles[i - 2][j], curr, bendElasticity, bendDamping, showSpring, "bend")
                if (j > 1) this.createSpring(this.particles[i][j - 2], curr, bendElasticity, bendDamping, showSpring, "bend")
                this.particles[i][j] = curr

            }
        }
        this.setFixedPoint(startPosition);
    }

    public setFixedPoint(p: Vector3){
        const change = this.fixedParticlesPositions[0].clone().sub(p);
        this.fixedParticles.forEach((p, i) => {
            const pos = this.fixedParticlesPositions[i].clone().sub(change)
            p.setPosition(pos.x, pos.y, pos.z);
        })
    }

    private createSpring(other: SpringParticle, curr: SpringParticle, elasticity: number, damping: number, showSpring: boolean, type: "normal" | "shear" | "bend" = "normal") {
        const spring = new Spring(other, curr, elasticity, damping, showSpring, type)
        this.springs.push(spring)
        other.addSpring(spring)
        curr.addSpring(spring)
    }

    getParticles(): SpringParticle[] {
        const flat: SpringParticle[] = []
        this.particles.forEach(arr => {
            arr.forEach(arr2 => {
                flat.push(arr2)
            })
        })
        return flat
    }

    getSprings(): Spring[] {
        return this.springs
    }

    setElasticity(e: number, type: "normal" | "shear" | "bend" = "normal"): void {
        const relevant: Spring[] = this.springs.filter(s => s.type === type);
        relevant.forEach(s => s.setElasticity(e))
    }

    setDamping(d: number, type: "normal" | "shear" | "bend" = "normal"): void {
        const relevant: Spring[] = this.springs.filter(s => s.type === type);
        relevant.forEach(s => s.setDamping(d))
    }

    setShowSpring(showSpring: boolean): void {
        this.springs.forEach(s => s.setShowSpring(showSpring));
    }

    setFixed(fixed: boolean): void {
        this.fixedParticles.forEach((p,i)=> p.setPosition(this.fixedParticlesPositions[i].x, this.fixedParticlesPositions[i].y,this.fixedParticlesPositions[i].z))
        this.fixedParticles.forEach(p => p.setFixed(fixed))
        this.fixed = fixed
    }

    update(): void{
        return
    }
}
import {
    BufferGeometry, DoubleSide, Float32BufferAttribute,
    Mesh, MeshLambertMaterial,
    MeshPhongMaterial, MeshToonMaterial,
    TextureLoader,
    Vector3,
} from 'three'
import { SpringParticle } from './SpringParticle'
import { Spring } from './Spring'


export class Cloth {
    private fixed: boolean
    private particles: SpringParticle[][] = []
    private springs: Spring[] = []
    private fixedParticles: SpringParticle[] = []
    private fixedParticlesPositions: Vector3[] = []
    private verticesBuffer: Float32BufferAttribute
    private normalsBuffer: Float32BufferAttribute
    private numberOfRows: number;
    private numberOfColumns: number;
    public mesh: Mesh
    private geometry = new BufferGeometry()
    public static material = new MeshPhongMaterial({
        color: 0x3c9663,
        side: DoubleSide
    })

    constructor(lifetime: number, bouncing: number, elasticity: number, damping: number, shearElasticity: number, shearDamping: number, bendElasticity: number, bendDamping: number, fixed: boolean, showSpring: boolean, startPosition: Vector3, numberOfRows = 50, numberOfColumns = numberOfRows, fixedIndices: Number[] = []) {
        const mass = 1 / (numberOfColumns * numberOfRows)
        const directionX = new Vector3((1 / numberOfColumns * 10) - (0.5 / numberOfColumns * 10), 0, 0)
        const directionY = new Vector3(0, 0, (1 / numberOfRows * 10) - (0.5 / numberOfRows * 10))

        this.numberOfColumns = numberOfColumns
        this.numberOfRows = numberOfRows
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
                    this.fixedParticlesPositions.push(new Vector3(pos.x, pos.y, pos.z))
                    curr.setFixed(fixed)
                }

                // Add stretch springs
                if (i > 0) this.createSpring(this.particles[i - 1][j], curr, elasticity, damping, showSpring)
                if (j > 0) this.createSpring(this.particles[i][j - 1], curr, elasticity, damping, showSpring)

                // Add shear springs
                if (i > 1 && j > 1) this.createSpring(this.particles[i - 2][j - 2], curr, shearElasticity, shearDamping, showSpring, 'shear')
                if (i > 1 && j > 1) this.createSpring(this.particles[i - 2][j], this.particles[i][j - 2], shearElasticity, shearDamping, showSpring, 'shear')

                // Add bend springs
                if (i > 1) this.createSpring(this.particles[i - 2][j], curr, bendElasticity, bendDamping, showSpring, 'bend')
                if (j > 1) this.createSpring(this.particles[i][j - 2], curr, bendElasticity, bendDamping, showSpring, 'bend')
                this.particles[i][j] = curr

            }
        }


        this.geometry = new BufferGeometry()

        const indices = []

        for (let i = 0; i < numberOfColumns - 1; i++) {

            for (let j = 0; j < numberOfRows - 1; j++) {

                const a = i * numberOfColumns + (j + 1)
                const b = i * numberOfColumns + j
                const c = (i + 1) * numberOfColumns + j
                const d = (i + 1) * numberOfColumns + (j + 1)

                // generate two faces (triangles) per iteration

                indices.push(a, b, d) // face one
                indices.push(b, c, d) // face two

            }

        }

        this.verticesBuffer = new Float32BufferAttribute(new Float32Array(this.numberOfColumns * this.numberOfRows * 3), 3)
        this.normalsBuffer = new Float32BufferAttribute(new Float32Array(this.numberOfColumns * this.numberOfRows * 3), 3)
        this.updateNormalAndVertexBuffers()

        this.geometry.setAttribute('position', this.verticesBuffer)
        this.geometry.setAttribute('normal', this.normalsBuffer)
        this.geometry.setIndex(indices)


        this.setFixedPoint(startPosition)
        console.log('texture used')

        if (!Cloth.material.map) {
            // instantiate a loader
            const loader = new TextureLoader()

            // load a resource
            loader.load(
                // resource URL
                'assets/pisa/nz.png',

                // onLoad callback
                (texture) => {
                    // in this example we create the material when the texture is loaded
                    console.log('texture loaded')
                    // Cloth.material.map = texture
                    this.mesh.material = Cloth.material
                },

                // onProgress callback currently not supported
                undefined,

                // onError callback
                (err) => {
                    console.error('An error happened.')
                },
            )
        }
        this.mesh = new Mesh(this.geometry, Cloth.material)
        this.mesh.castShadow = true;
    }

    private updateNormalAndVertexBuffers() {
        for (let i = 0; i < this.numberOfColumns; i++) {
            for (let j = 0; j < this.numberOfRows; j++) {
                const pos = this.particles[i][j].getCurrentPosition()
                const right = i === this.numberOfColumns - 1 ? this.particles[i - 1][j].getCurrentPosition() : this.particles[i + 1][j].getCurrentPosition()
                const below = j === this.numberOfRows - 1 ? this.particles[i][j - 1].getCurrentPosition() : this.particles[i][j + 1].getCurrentPosition()
                this.verticesBuffer.setXYZ((i * this.numberOfColumns) + j, pos.x, pos.y, pos.z)
                const normal = new Vector3().subVectors(right, pos).cross(new Vector3().subVectors(below, pos))
                if(i === this.numberOfColumns - 1 ? !(j === this.numberOfRows - 1) : j === this.numberOfRows - 1 ) normal.negate();
                this.normalsBuffer.setXYZ((i * this.numberOfColumns) + j, normal.x, normal.y, normal.z)
            }
        }
        this.normalsBuffer.needsUpdate = true;
        this.verticesBuffer.needsUpdate = true;
    }

    public setFixedPoint(p: Vector3) {
        const change = this.fixedParticlesPositions[0].clone().sub(p)
        this.fixedParticles.forEach((p, i) => {
            const pos = this.fixedParticlesPositions[i].clone().sub(change)
            p.setPosition(pos.x, pos.y, pos.z)
        })
    }

    private createSpring(other: SpringParticle, curr: SpringParticle, elasticity: number, damping: number, showSpring: boolean, type: 'normal' | 'shear' | 'bend' = 'normal') {
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

    setElasticity(e: number, type: 'normal' | 'shear' | 'bend' = 'normal'): void {
        const relevant: Spring[] = this.springs.filter(s => s.type === type)
        relevant.forEach(s => s.setElasticity(e))
    }

    setDamping(d: number, type: 'normal' | 'shear' | 'bend' = 'normal'): void {
        const relevant: Spring[] = this.springs.filter(s => s.type === type)
        relevant.forEach(s => s.setDamping(d))
    }

    setShowSpring(showSpring: boolean): void {
        this.springs.forEach(s => s.setShowSpring(showSpring))
    }

    setFixed(fixed: boolean): void {
        this.fixedParticles.forEach((p, i) => p.setPosition(this.fixedParticlesPositions[i].x, this.fixedParticlesPositions[i].y, this.fixedParticlesPositions[i].z))
        this.fixedParticles.forEach(p => p.setFixed(fixed))
        this.fixed = fixed
    }

    update(): void {
        if(this.mesh.visible) this.updateNormalAndVertexBuffers();
        return
    }
}
import {
    Vector3,
    Plane,
    Scene,
    PlaneHelper,
    Sphere,
    SphereGeometry,
    Mesh,
    MeshPhongMaterial,
} from 'three'
import { Particle } from './Particle'
import { Rope } from './Rope'
import { Cloth } from './Cloth'


const SPHERE_RADIUS = 3

export class Simulation {
    private params = {
        removeAllParticles: () => {
            this.removeAllParticles()
        },
        respawn: () => {
            this.spawnParticles()
        },
        spawnMethod: 'cloth',
        arePlanesVisible: false,
        ropeFixed: true,
        showParticles: false,
        showSpring: false,
        showCloth: true,
        enableNormalSpring: true,
        enableShearSpring: true,
        enableBendSpring: true,
        solverMethod: 'verlet',
        bouncing: 0.8,
        lifetime: 80,
        elasticity: 30,
        damping: 5,
        shearElasticity: 30,
        shearDamping: 5,
        bendElasticity: 30,
        bendDamping: 5,
        // mass: 0.010000001,
        dt: 0.012,
        particlesPerRope: 10,
        gravity: {
            x: 0,
            y: -9.81,
            z: 0,
        },
        fixEvery: 1,
        fixedPoint: {
            x: -2.50000001,
            y: 3.0000001,
            z: 0.0000001,
        },
        sphereCentre: {
            x: 0.0000001,
            y: -3.9999999,
            z: 0.0000001,
        },
    }

    public particles: Particle[] = []
    public planes: Plane[] = []
    public collisionCount = 0
    public scene: Scene

    private planeHelpers: PlaneHelper[] = []
    private sphere = new Sphere(new Vector3(this.params.sphereCentre.x, this.params.sphereCentre.y, this.params.sphereCentre.z), SPHERE_RADIUS)
    private sphereMesh = new Mesh(new SphereGeometry(SPHERE_RADIUS - Particle.radius), new MeshPhongMaterial())
    private ropesAndCloths: (Rope | Cloth)[] = []

    constructor(scene: Scene, gui: any) {
        this.scene = scene
        this.createSphere()
        this.createGui(gui)
        this.createPlanes()
        this.spawnParticles()
    }

    private createSphere() {
        this.sphereMesh.material.color.setHSL(.96, 1, .5)
        this.sphereMesh.position.set(this.params.sphereCentre.x, this.params.sphereCentre.y, this.params.sphereCentre.z)
        this.sphereMesh.receiveShadow = true;
        this.scene.add(this.sphereMesh)
    }

    private createGui(gui: any) {
        gui.add(this.params, 'removeAllParticles').name('Remove Particles')
        gui.add(this.params, 'respawn').name('Spawn Particles')
        gui.add(this.params, 'spawnMethod', ['waterfall', 'explosion', 'semi-sphere', 'fountain', 'rope', 'cloth'])
            .onChange(() => this.spawnParticles())
            .name('Spawn Method')
        gui.add(this.params, 'solverMethod', ['euler-semi', 'euler-orig', 'verlet'])
            .name('Solver Method')
        gui.add(this.params, 'bouncing', 0, 1)
            .name('Bouncing')
            .onChange((b: number) => this.particles.forEach(p => p.setBouncing(b)))
        gui.add(this.params, 'lifetime', 0, 100)
            .name('Lifetime')
            .onChange((b: number) => this.particles.forEach(p => p.setLifetime(b)))
        gui.add(this.params, 'dt', 0, 0.1)
            .name('dt')
        gui.add(this.params, 'particlesPerRope', 5, 200, 1)
            .name('Particles Per Rope')
        // gui.add(this.params, 'mass', 0, 2)
        //     .name('Mass')
        //     .onChange((m: number) => this.setMass(m));
        gui.add(this.params, 'ropeFixed')
            .name('Fix Rope / Cloth')
            .onChange(() => this.ropesAndCloths.forEach(rope => rope.setFixed(this.params.ropeFixed)))
        gui.add(this.params, 'arePlanesVisible')
            .name('Show Planes')
            .onChange(() => this.togglePlaneHelperVisibility())
        gui.add(this.params, 'showParticles')
            .onChange((s: boolean) => this.particles.forEach(r => r.getMesh().visible = s))
        gui.add(this.params, 'showCloth')
            .onChange((s: boolean) => this.ropesAndCloths.forEach(r => {
                if (r.mesh) r.mesh.visible = s
            }))
        gui.add(this.params, 'showSpring')
            .onChange((s: boolean) => this.ropesAndCloths.forEach(r => r.setShowSpring(s)))
        gui.add(this.params, 'enableNormalSpring')
            .onChange((s: boolean) => this.ropesAndCloths.forEach(r => r.setEnableSpring(s, "normal")))
        gui.add(this.params, 'enableShearSpring')
            .onChange((s: boolean) => this.ropesAndCloths.forEach(r => r.setEnableSpring(s, "shear")))
        gui.add(this.params, 'enableBendSpring')
            .onChange((s: boolean) => this.ropesAndCloths.forEach(r => r.setEnableSpring(s, "bend")))
        const springsFolder: any = gui.addFolder('Springs')
        springsFolder.add(this.params, 'elasticity', 0, 500)
            .onChange((e: number) => this.ropesAndCloths.forEach(r => r.setElasticity(e)))
        springsFolder.add(this.params, 'damping', 0, 500)
            .onChange((d: number) => this.ropesAndCloths.forEach(r => r.setDamping(d)))
        springsFolder.add(this.params, 'shearElasticity', 0, 500)
            .onChange((e: number) => this.ropesAndCloths.forEach(r => r.setElasticity(e, 'shear')))
        springsFolder.add(this.params, 'shearDamping', 0, 500)
            .onChange((d: number) => this.ropesAndCloths.forEach(r => r.setDamping(d, 'shear')))
        springsFolder.add(this.params, 'bendElasticity', 0, 500)
            .onChange((e: number) => this.ropesAndCloths.forEach(r => r.setElasticity(e, 'bend')))
        springsFolder.add(this.params, 'bendDamping', 0, 500)
            .onChange((d: number) => this.ropesAndCloths.forEach(r => r.setDamping(d, 'bend')))
        const gravityFolder: any = gui.addFolder('Gravity')
        gravityFolder.add(this.params.gravity, 'x', -20, 20)
            .onChange(() => this.applyGravityToAllParticles())
        gravityFolder.add(this.params.gravity, 'y', -20, 20)
            .onChange(() => this.applyGravityToAllParticles())
        gravityFolder.add(this.params.gravity, 'z', -20, 20)
            .onChange(() => this.applyGravityToAllParticles())
        const fixedPointFolder: any = gui.addFolder('Fixed Point')
        fixedPointFolder.add(this.params, 'fixEvery', 1, 10, 1)
            .name('fix every nth particle')
        fixedPointFolder.add(this.params.fixedPoint, 'x', -5, 5)
            .onChange(() => this.onFixedPointChange())
        fixedPointFolder.add(this.params.fixedPoint, 'y', -5, 5)
            .onChange(() => this.onFixedPointChange())
        fixedPointFolder.add(this.params.fixedPoint, 'z', -5, 5)
            .onChange(() => this.onFixedPointChange())
        const sphereCentreFolder: any = gui.addFolder('Sphere Position')
        sphereCentreFolder.add(this.params.sphereCentre, 'x', -5, 5)
            .onChange(() => {
                this.sphereMesh.position.x = this.params.sphereCentre.x
                this.sphere.center.x = this.params.sphereCentre.x
            })
        sphereCentreFolder.add(this.params.sphereCentre, 'y', -5, 5)
            .onChange(() => {
                this.sphereMesh.position.y = this.params.sphereCentre.y
                this.sphere.center.y = this.params.sphereCentre.y
            })
        sphereCentreFolder.add(this.params.sphereCentre, 'z', -5, 5)
            .onChange(() => {
                this.sphereMesh.position.z = this.params.sphereCentre.z
                this.sphere.center.z = this.params.sphereCentre.z
            })

    }

    // private setMass(m: number) {
    //     this.params.mass = m;
    //     this.particles.forEach(p => p.setMass(m));
    // }

    createPlanes() {
        const bottomPlane = new Plane(new Vector3(0, 1, 0), 10)
        const topPlane = new Plane(new Vector3(0, -1, 0), 10)
        const frontPlane = new Plane(new Vector3(0, 0, -1), 10)
        const backPlane = new Plane(new Vector3(0, 0, 1), 10)
        const rightPlane = new Plane(new Vector3(1, 0, 0), 10)
        const leftPlane = new Plane(new Vector3(-1, 0, 0), 10)
        this.planes.push(bottomPlane, topPlane, frontPlane, backPlane, rightPlane, leftPlane)

        this.planeHelpers = this.planes.map((plane) => {
            const visualizedPlane = plane.clone()
            visualizedPlane.translate(visualizedPlane.normal.clone().normalize().multiplyScalar(-Particle.radius))
            const helper = new PlaneHelper(visualizedPlane, 20 + (2 * Particle.radius), 0xffff00)
            helper.visible = this.params.arePlanesVisible
            this.scene.add(helper)
            return helper
        })
    }

    togglePlaneHelperVisibility() {
        this.planeHelpers.forEach(p => p.visible = this.params.arePlanesVisible)
    }

    applyGravityToAllParticles() {
        this.particles.forEach(p =>
            p.setForce(this.params.gravity.x, this.params.gravity.y, this.params.gravity.z),
        )
    }

    spawnParticles() {

        if (this.params.spawnMethod === 'rope') {
            this.spawnRope()
            return
        }

        if (this.params.spawnMethod === 'cloth') {
            this.spawnCloth()
            return
        }
        if (this.isMethodAtBeginning()) {
            for (let i = 0; i < 500; i++) {
                this.spawnRandomParticle(this.params.spawnMethod)
            }
        }
    }

    spawnRope() {
        const fixedPoint = new Vector3(this.params.fixedPoint.x, this.params.fixedPoint.y, this.params.fixedPoint.z)
        const rope = new Rope(this.params.lifetime, this.params.bouncing, this.params.elasticity, this.params.damping, this.params.ropeFixed, this.params.showSpring, fixedPoint, this.params.particlesPerRope)
        const particles = rope.getParticles()
        particles.forEach(p => {
            const mesh = p.getMesh()
            mesh.visible = this.params.showParticles
            this.scene.add(mesh)
            this.particles.push(p)
        })
        const springs = rope.getSprings()
        springs.forEach(s => {
            this.scene.add(s.getMesh())
        })
        this.ropesAndCloths.push(rope)
    }

    spawnCloth() {
        const fixedIndices = []
        for (let i = 0; i < this.params.particlesPerRope; i++) {
            if (i % this.params.fixEvery === 0) {
                fixedIndices.push(i)
            }
        }

        const fixedPointA = new Vector3(this.params.fixedPoint.x, this.params.fixedPoint.y, this.params.fixedPoint.z)
        const cloth = new Cloth(this.params.lifetime, this.params.bouncing, this.params.elasticity, this.params.damping, this.params.shearElasticity, this.params.shearDamping, this.params.bendElasticity, this.params.bendDamping, this.params.ropeFixed, this.params.showSpring, fixedPointA, this.params.particlesPerRope, this.params.particlesPerRope, fixedIndices)
        const particles = cloth.getParticles()
        particles.forEach(p => {
            const mesh = p.getMesh()
            mesh.visible = this.params.showParticles
            this.scene.add(mesh)
            this.particles.push(p)
        })
        const springs = cloth.getSprings()
        springs.forEach(s => {
            this.scene.add(s.getMesh())
        })
        this.scene.add(cloth.mesh)
        cloth.mesh.visible = this.params.showCloth;
        this.ropesAndCloths.push(cloth)
    }

    removeAllParticles() {
        this.ropesAndCloths.forEach(rc => {
            if (rc.mesh) this.scene.remove(rc.mesh)
        })
        this.particles.forEach(p => {
            p.delete()
        })
        this.particles = []
    }

    isMethodAtBeginning() {
        return this.params.spawnMethod === 'semi-sphere' || this.params.spawnMethod === 'explosion' || this.params.spawnMethod === 'rope' || this.params.spawnMethod === 'cloth'
    }

    update(t: number) {
        this.removeDeadParticles()

        if (!this.isMethodAtBeginning() && Math.floor(t) % 100 < 50) {
            this.spawnRandomParticle(this.params.spawnMethod)
        }

        this.ropesAndCloths.forEach(rope => {
            rope.update(this.params.fixedPoint)
        })

        this.particles.forEach(p => {
            p.setForce(this.params.gravity.x, this.params.gravity.y, this.params.gravity.z)
            p.updateParticle(this.params.dt, this.params.solverMethod)
            //Check Floor collisions
            for (const plane of this.planes) {
                if (p.collisionParticlePlane(plane)) {
                    p.correctCollisionParticlePlain(plane, this.params.solverMethod)
                }
            }
            if (p.colllisionParticleSphere(this.sphere)) {
                p.correctCollisionParticleSphere(this.sphere, this.params.solverMethod)
            }
        })

    }

    private spawnRandomParticle(method: string) {
        const p = new Particle(0.0, 0.0, 0.0, this.params.bouncing, this.params.lifetime, 1)
        this.particles.push(p)
        switch (method) {
            case 'waterfall':
                p.setVelocity(5 * (Math.random() - 0.5), 0, 5 * (Math.random() - 0.5))
                break
            case 'fountain':
                p.setVelocity(5 * (Math.random() - 0.5), 10, 5 * (Math.random() - 0.5))
                break
            case 'semi-sphere': {
                const position = this.getRandomSpherePosition(true)
                p.setVelocity(10 * position.x, 10 * position.y, 10 * position.z)
            }
                break
            case 'explosion': {
                const position = this.getRandomSpherePosition()
                p.setVelocity(10 * position.x, 10 * position.y, 10 * position.z)
            }
                break
        }
        const mesh = p.getMesh()
        mesh.visible = this.params.showParticles
        this.scene.add(mesh)
    }

    private degsToRads(deg: number) {
        return (deg * Math.PI) / 180.0
    };

    private getRandomSpherePosition(isSemiSphere = false) {
        const alpha = this.degsToRads(360) * (Math.random() - 0.5)
        const beta = this.degsToRads(isSemiSphere ? 90 : 180) * (Math.random() - (isSemiSphere ? 0 : 0.5))
        return new Vector3(Math.cos(alpha) * Math.cos(beta), Math.sin(beta), Math.cos(beta) * Math.sin(alpha))
    }

    removeDeadParticles() {
        for (let i = 0; i < this.particles.length;) {
            if (this.particles[i].getLifetime() < 0) {
                this.particles[i].delete()
                this.particles.splice(i, 1)
            } else {
                i++
            }
        }
    }

    private onFixedPointChange() {
        this.ropesAndCloths.forEach(rc => rc.setFixedPoint(new Vector3(this.params.fixedPoint.x, this.params.fixedPoint.y, this.params.fixedPoint.z)))
    }
}
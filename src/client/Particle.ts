import {Vector3, Plane, Mesh, SphereGeometry, MeshNormalMaterial, Sphere, Material} from "three";

export class Particle {
    private currentPosition: Vector3 = new Vector3();
    private previousPosition: Vector3 = new Vector3();
    private velocity: Vector3 = new Vector3();
    private force: Vector3 = new Vector3();

    private bouncing: number = 1;
    private lifetime: number = 0;
    private fixed: boolean = false;
    private firstRound = true;

    public static radius = 0.07;

    private mesh: Mesh;
    private static geometry = new SphereGeometry(Particle.radius);
    private static material = new MeshNormalMaterial();

    private verletConstant = 0.99;


    // vector to save intermediate calculations
    private vector1 = new Vector3();
    private mass: number;


    constructor(x: number, y: number, z: number, bouncing: number, lifetime: number, mass: number) {
        this.currentPosition.set(x, y, z);
        this.bouncing = bouncing;
        this.lifetime = lifetime;
        this.mass = mass;
        this.mesh = new Mesh(Particle.geometry, Particle.material);
    }

    // setters
    public setPosition(x: number, y: number, z: number): void {
        this.currentPosition.set(x, y, z);
    };

    public setPreviousPosition(x: number, y: number, z: number): void {
        this.previousPosition.set(x, y, z)
    };

    public setVelocity(x: number, y: number, z: number): void {
        this.velocity.set(x, y, z)
    };

    public setForce(x: number, y: number, z: number): void {
        this.force.set(x, y, z)
    };

    public setBouncing(bouncing: number): void {
        this.bouncing = bouncing;
    };

    public setLifetime(lifetime: number): void {
        this.lifetime = lifetime;
    };

    public setMass(mass: number): void {
        this.mass = mass;
    };

    public setFixed(fixed: boolean): void {
        this.fixed = fixed;
    };


    //getters
    public getCurrentPosition(): Vector3 {
        return this.currentPosition
    };

    public getPreviousPosition(): Vector3 {
        return this.previousPosition
    };

    public getVelocity(): Vector3 {
        return this.velocity
    };

    public getMesh(): Mesh {
        return this.mesh
    };


    public delete() {
        this.mesh.geometry.dispose();
        if (this.mesh.material instanceof Material) {
            this.mesh.material.dispose();
        }
        this.mesh.parent?.remove(this.mesh);
    }


    public getBouncing(): number {
        return this.bouncing
    };

    public getLifetime(): number {
        return this.lifetime
    };

    public isFixed(): boolean {
        return this.fixed;
    };


    public addForce(force: Vector3) {
        this.force.add(force);
    }

    public updateParticle(dt: number, method: string) {
        this.lifetime -= dt;
        if (!this.fixed) {
            switch (method) {
                case "euler-semi":
                    this.previousPosition.copy(this.currentPosition);
                    this.velocity = this.velocity.addScaledVector(this.force, dt / this.mass);
                    this.currentPosition = this.currentPosition.addScaledVector(this.velocity, dt);

                    break;
                case "euler-orig":
                    this.previousPosition.copy(this.currentPosition);
                    this.currentPosition = this.currentPosition.addScaledVector(this.velocity, dt / this.mass);
                    this.velocity = this.velocity.addScaledVector(this.force, dt);

                    break;
                case "verlet":
                    if (this.firstRound) {
                        this.previousPosition.subVectors(this.currentPosition, this.velocity.multiplyScalar(dt / this.mass))
                        break;
                    }
                    // vector1 is previous to current and is just used for performance
                    this.vector1.subVectors(this.currentPosition, this.previousPosition);
                    this.previousPosition.copy(this.currentPosition);
                    this.currentPosition.addScaledVector(this.vector1, this.verletConstant).addScaledVector(this.force, dt * dt)
                    this.velocity.subVectors(this.currentPosition, this.previousPosition).multiplyScalar(1 / dt);

                    break;
                default:
                    break;
            }

        }
        this.mesh.position.copy(this.currentPosition);

        this.firstRound = false;
        return;
    }

    public collisionParticlePlane(p: Plane) {
        let sign: number;
        // TODO: check the following calculation:

        sign = this.currentPosition.dot(p.normal) + p.constant;
        // sign = glm::dot(m_currentPosition, p.normal) + p.d;
        sign *= this.previousPosition.dot(p.normal) + p.constant;
        // sign *= glm::dot(m_previousPosition, p.normal) + p.d;

        return sign <= 0

    }

    public correctCollisionParticlePlain(p: Plane, method: string) {
        // TODO: check the following calculation especially what p.d refers to???:
        const normalizedNormal: Vector3 = p.normal.normalize()
        // the original implementation is like this: 	float d = -glm::dot(point, normal);
        // implementation of threejs confirms that it is the same: 		this.constant = - point.dot( this.normal );
        // m_currentPosition = m_currentPosition - (1 + m_bouncing) * (glm::dot(m_currentPosition, p.normal) + p.d) * p.normal;
        this.currentPosition = this.currentPosition.sub(normalizedNormal.clone().multiplyScalar(((1 + this.bouncing) * (this.currentPosition.clone().dot(normalizedNormal) + p.constant))));
        // m_velocity = m_velocity - (1 + m_bouncing) * (glm::dot(m_velocity, p.normal) + p.d) * p.normal;
        this.velocity = this.velocity.clone().sub(normalizedNormal.clone().multiplyScalar(((1 + this.bouncing) * (this.velocity.clone().dot(normalizedNormal)))));


    }

    public logInfo() {
        console.log(`lifetime: ${this.lifetime}`);
        console.log(`position = ${this.currentPosition.x} ${this.currentPosition.y} ${this.currentPosition.z} velocity = ${this.velocity.x} ${this.velocity.y} ${this.velocity.z}`)
    }

    colllisionParticleSphere(sphere: Sphere) {
        return this.currentPosition.distanceTo(sphere.center) < sphere.radius;
    }

    correctCollisionParticleSphere(sphere: Sphere, method: string) {
        const direction = this.currentPosition.clone().sub(sphere.center).normalize();
        const pointOnSphere = sphere.center.clone().addScaledVector(direction, sphere.radius);
        const plane = new Plane();
        plane.setFromNormalAndCoplanarPoint(direction, pointOnSphere);
        this.correctCollisionParticlePlain(plane, method);
    }
}
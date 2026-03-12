export interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IPoint {
  x: number;
  y: number;
}

export interface IQuadEntity extends IPoint {
  id: string;
}

export class QuadTree<T extends IQuadEntity> {
  private capacity: number;
  private boundary: IRect;
  private entities: T[];
  private divided: boolean;
  private topLeft?: QuadTree<T>;
  private topRight?: QuadTree<T>;
  private bottomLeft?: QuadTree<T>;
  private bottomRight?: QuadTree<T>;

  constructor(boundary: IRect, capacity: number = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.entities = [];
    this.divided = false;
  }

  private subdivide(): void {
    const { x, y, width, height } = this.boundary;
    const w = width / 2;
    const h = height / 2;

    this.topLeft = new QuadTree({ x, y, width: w, height: h }, this.capacity);
    this.topRight = new QuadTree({ x: x + w, y, width: w, height: h }, this.capacity);
    this.bottomLeft = new QuadTree({ x, y: y + h, width: w, height: h }, this.capacity);
    this.bottomRight = new QuadTree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);

    this.divided = true;

    // Move existing entities into sub-quadrants
    for (const entity of this.entities) {
      this.insertToChildren(entity);
    }
    this.entities = [];
  }

  private contains(point: IPoint): boolean {
    return (
      point.x >= this.boundary.x &&
      point.x < this.boundary.x + this.boundary.width &&
      point.y >= this.boundary.y &&
      point.y < this.boundary.y + this.boundary.height
    );
  }

  insert(entity: T): boolean {
    if (!this.contains(entity)) {
      return false;
    }

    if (!this.divided) {
      if (this.entities.length < this.capacity) {
        this.entities.push(entity);
        return true;
      }
      this.subdivide();
    }

    return this.insertToChildren(entity);
  }

  private insertToChildren(entity: T): boolean {
    return (
      this.topLeft!.insert(entity) ||
      this.topRight!.insert(entity) ||
      this.bottomLeft!.insert(entity) ||
      this.bottomRight!.insert(entity)
    );
  }

  query(range: IRect, found: T[] = []): T[] {
    if (!this.intersects(range)) {
      return found;
    }

    if (this.divided) {
      this.topLeft!.query(range, found);
      this.topRight!.query(range, found);
      this.bottomLeft!.query(range, found);
      this.bottomRight!.query(range, found);
    } else {
      for (const entity of this.entities) {
        if (this.rectContains(range, entity)) {
          found.push(entity);
        }
      }
    }

    return found;
  }

  private intersects(range: IRect): boolean {
    return !(
      range.x > this.boundary.x + this.boundary.width ||
      range.x + range.width < this.boundary.x ||
      range.y > this.boundary.y + this.boundary.height ||
      range.y + range.height < this.boundary.y
    );
  }

  private rectContains(range: IRect, point: IPoint): boolean {
    return (
      point.x >= range.x &&
      point.x < range.x + range.width &&
      point.y >= range.y &&
      point.y < range.y + range.height
    );
  }

  clear(): void {
    this.entities = [];
    this.divided = false;
    this.topLeft = undefined;
    this.topRight = undefined;
    this.bottomLeft = undefined;
    this.bottomRight = undefined;
  }
}

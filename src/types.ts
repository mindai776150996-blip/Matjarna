export interface Product {
  id: number;
  name: string;
  images: string[];
  description: string;
  group: string;
  section: string;
  image_sections: string[];
  price: string;
  star: number;
  amount: number;
}

export interface Category {
    group: string;
    sections: string[];
}
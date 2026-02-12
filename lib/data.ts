
export interface Product {
  id: string;
  image: string;
  title: string;
  badge?: string;
  duration: string;
  features?: string[];
  bookedText?: string;
  rating?: number;
  reviews?: number;
  price?: number;
  currency?: string;
}

export const products: Product[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1541336032412-2048a614051f?q=80&w=2070&auto=format&fit=crop', // Rome landscape / Appian Way vibes
    title: 'Rome: Appian Way & Aqueducts E-Bike Tour (Catacombs & Food)',
    badge: 'Top pick',
    duration: '3.5 - 5 hours',
    features: ['Private option available'],
    bookedText: 'Booked 3 times yesterday',
    rating: 4.8,
    reviews: 120,
    price: 65,
    currency: '€'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1974&auto=format&fit=crop', // Catacombs vibes
    title: 'Rome: Skip the line Catacombs Underground Group Tour',
    duration: '1 hour',
    features: ['Skip the line'],
    rating: 4.5,
    reviews: 85,
    price: 25,
    currency: '€'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1552483775-db7297b2d5f8?q=80&w=2070&auto=format&fit=crop', // Aqueducts vibes
    title: 'Rome: Appian Way, Aqueducts, and Catacombs Tour',
    badge: 'Top rated',
    duration: '195 minutes',
    features: ['Private option available'],
    rating: 4.9,
    reviews: 210,
    price: 55,
    currency: '€'
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?q=80&w=2070&auto=format&fit=crop', // Roman ruins
    title: 'Rome: Appian Way Golf Cart Tour with Roman Catacombs Entry',
    badge: 'Top rated',
    duration: '2.5 hours',
    features: ['Access by Foot'],
    rating: 4.7,
    reviews: 150,
    price: 80,
    currency: '€'
  }
];

export const filters = [
  'Dates',
  'Bike tours',
  'Walking tours',
  'Scooters & motorcycles',
  'Bus tours',
  'Entry tickets',
  'Tours on wheels',
  'Electric cars'
];

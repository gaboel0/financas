import {
  Building, Building2, CircleDollarSign, CreditCard, Droplets, Dumbbell, Flame, GraduationCap, Hammer,
  Heart, HeartHandshake, House, Landmark, PiggyBank, Phone, Receipt, ShoppingCart, Target, Tv, Utensils,
  Wallet, Wifi, Zap, Car, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  home: House,
  "building-2": Building2,
  building: Building,
  "credit-card": CreditCard,
  zap: Zap,
  wifi: Wifi,
  "piggy-bank": PiggyBank,
  "heart-handshake": HeartHandshake,
  hammer: Hammer,
  receipt: Receipt,
  "shopping-cart": ShoppingCart,
  car: Car,
  utensils: Utensils,
  heart: Heart,
  wallet: Wallet,
  landmark: Landmark,
  droplets: Droplets,
  flame: Flame,
  phone: Phone,
  "graduation-cap": GraduationCap,
  dumbbell: Dumbbell,
  tv: Tv,
  target: Target,
  money: CircleDollarSign,
};

export const ICON_OPTIONS = Object.keys(ICONS);

export function iconFor(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Receipt;
}

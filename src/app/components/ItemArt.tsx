import {
  Coffee,
  Pizza,
  Laptop,
  Plane,
  CarFront,
  House,
  Utensils,
  Footprints,
} from "lucide-react";
const icons = {
  coffee: Coffee,
  pizza: Pizza,
  laptop: Laptop,
  plane: Plane,
  car: CarFront,
  home: House,
  dinner: Utensils,
  sneaker: Footprints,
};
export default function ItemArt({
  icon,
  large = false,
}: {
  icon: string;
  large?: boolean;
}) {
  const Icon = icons[icon as keyof typeof icons] || Coffee;
  return (
    <div className={`item-art ${large ? "large" : ""}`} aria-hidden="true">
      <div className="art-orbit" />
      <Icon strokeWidth={1.25} />
      <span className="art-star star-one">✦</span>
      <span className="art-star star-two">+</span>
    </div>
  );
}

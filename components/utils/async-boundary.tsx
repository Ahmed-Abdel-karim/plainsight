import { Suspense, type ComponentType, type ReactNode } from "react";

type AsyncBoundaryProps<T> = {
  data: () => Promise<T>;
  Component: ComponentType<{ data: T }>;
  fallback: ReactNode;
};

const Resolve = async <T,>({
  data,
  Component,
}: Omit<AsyncBoundaryProps<T>, "fallback">) => {
  const resolved = await data();
  return <Component data={resolved} />;
};

export const AsyncBoundary = <T,>({
  data,
  Component,
  fallback,
}: AsyncBoundaryProps<T>) => {
  return (
    <Suspense fallback={fallback}>
      <Resolve data={data} Component={Component} />
    </Suspense>
  );
};

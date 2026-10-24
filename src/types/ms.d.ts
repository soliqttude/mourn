declare module "ms" {
  function ms(value: string | number, options?: { long?: boolean }): number | string;
  export default ms;
}

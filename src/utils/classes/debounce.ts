// * Debounce, like an elevator door, wait for certain amount of inactivity before closing
class Debounce {
  private timeout: number | null = null;

  public call = (callback: () => void, delay: number) => {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(callback, delay);
  };

  public cancel = () => {
    if (!this.timeout) {
      return;
    }

    clearTimeout(this.timeout);
    this.timeout = null;
  };
}

export default Debounce;

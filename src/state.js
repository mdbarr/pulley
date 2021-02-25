import { version } from '@/../package.json';

function State () {
  this.version = version;

  this.session = null;
  this.loading = false;
}

export default new State();

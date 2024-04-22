import { transactionalTest } from "../test/nest/transactional.test";
import { decorator } from "./decorator";


class SomeService {
  @transactionalTest()
  async foo(): Promise<string> {
    return "";
  }
}


const logging = decorator<(...args: unknown[]) => Promise<void>>(async inv => {
  console.log("start");
  try {
    return await inv.execute();
  } finally {
    console.log("end");
  }
});

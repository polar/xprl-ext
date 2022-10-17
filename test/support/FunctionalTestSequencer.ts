import Sequencer from '@jest/test-sequencer'
import type {Test} from '@jest/test-result';

export default class CustomSequencer extends Sequencer {
    sort(tests: Test[]) {
        const copyTests = Array.from(tests);
        return copyTests.sort((testA , testB) => (testA.path < testB.path ? -1 : 1));
    }
}

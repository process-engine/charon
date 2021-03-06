import {IShape} from '@process-engine/bpmn-elements_contracts';

import {IBpmnModeler, IIndextab, IPageModel, ISection} from '../../../../../contracts';
import {BasicsSection} from './sections/basics/basics';
import {CallActivitySection} from './sections/call-activity/call-activity';
import {ConditionalEventSection} from './sections/conditional-event/conditional-event';
import {ErrorEventSection} from './sections/error-event/error-event';
import {EscalationEventSection} from './sections/escalation-event/escalation-event';
import {FlowSection} from './sections/flow/flow';
import {MessageEventSection} from './sections/message-event/message-event';
import {MessageTaskSection} from './sections/message-task/message-task';
import {PoolSection} from './sections/pool/pool';
import {ProcessSection} from './sections/process/process';
import {ScriptTaskSection} from './sections/script-task/script-task';
import {ServiceTaskSection} from './sections/service-task/service-task';
import {SignalEventSection} from './sections/signal-event/signal-event';
import {TimerEventSection} from './sections/timer-event/timer-event';
import {LinkEventSection} from './sections/link-event/link-event';
import {ExclusiveGatewaySection} from './sections/exclusive-gateway/exclusive-gateway';
import {UntypedTaskSection} from './sections/untyped-task/untyped-task';
import {ManualTaskSection} from './sections/manual-task/manual-task';
import {DataOutputAssociationSection} from './sections/data-objects/data-output-association/data-output-association';
import {DataInputAssociationSection} from './sections/data-objects/data-input-association/data-input-association';
import {DataObjectsSection} from './sections/data-objects/data-objects';

export class General implements IIndextab {
  public title: string = 'General';
  public path: string = '/indextabs/general/general';

  public modeler: IBpmnModeler;
  public elementInPanel: IShape;

  public basicsSection: ISection = new BasicsSection();
  public poolSection: ISection = new PoolSection();
  public messageEventSection: ISection = new MessageEventSection();
  public messageTaskSection: ISection = new MessageTaskSection();
  public signalEventSection: ISection = new SignalEventSection();
  public scriptTaskSection: ISection = new ScriptTaskSection();
  public callActivitySection: ISection = new CallActivitySection();
  public flowSection: ISection = new FlowSection();
  public errorEventSection: ISection = new ErrorEventSection();
  public escalationEventSection: ISection = new EscalationEventSection();
  public timerEventSection: ISection = new TimerEventSection();
  public conditionalEventSection: ISection = new ConditionalEventSection();
  public processSection: ISection = new ProcessSection();
  public serviceTaskSection: ISection = new ServiceTaskSection();
  public linkEventSection: ISection = new LinkEventSection();
  public exclusiveGatewaySection: ISection = new ExclusiveGatewaySection();
  public untypedTaskSection: ISection = new UntypedTaskSection();
  public manualTaskSection: ISection = new ManualTaskSection();
  public dataObjectsSection: ISection = new DataObjectsSection();
  public dataInputAssociationSection: ISection = new DataInputAssociationSection();
  public dataOutputAssociationSection: ISection = new DataOutputAssociationSection();

  public sections: Array<ISection> = [
    this.basicsSection,
    this.poolSection,
    this.messageEventSection,
    this.messageTaskSection,
    this.signalEventSection,
    this.scriptTaskSection,
    this.callActivitySection,
    this.flowSection,
    this.errorEventSection,
    this.escalationEventSection,
    this.timerEventSection,
    this.conditionalEventSection,
    this.processSection,
    this.serviceTaskSection,
    this.linkEventSection,
    this.exclusiveGatewaySection,
    this.untypedTaskSection,
    this.manualTaskSection,
    this.dataObjectsSection,
    this.dataInputAssociationSection,
    this.dataOutputAssociationSection,
  ];

  public canHandleElement: boolean = true;

  public activate(model: IPageModel): void {
    /*
     * This is necessary because since v1.12.0 of aurelia-templating-resources there is a bug
     * which triggers the activate function although the form section is already detached.
     */
    if (model == null) {
      return;
    }

    this.elementInPanel = model.elementInPanel;
    this.modeler = model.modeler;
  }

  public isSuitableForElement(element: IShape): boolean {
    if (element == null) {
      return false;
    }

    this.sections.forEach((section: ISection) => {
      section.canHandleElement = section.isSuitableForElement(element);
    });

    return this.sections.some((section: ISection) => {
      return section.canHandleElement;
    });
  }
}

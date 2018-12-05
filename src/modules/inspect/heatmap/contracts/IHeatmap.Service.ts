import {ActiveToken, FlowNodeRuntimeInformation} from '@process-engine/kpi_api_contracts';
import {ProcessModelExecution} from '@process-engine/management_api_contracts';
import {IFlowNodeAssociation} from '.';
import {IBpmnModeler, IElementRegistry, IOverlayManager} from '../../../../contracts';

export interface IHeatmapService {
  getRuntimeInformationForProcessModel(processModelId: string): Promise<Array<FlowNodeRuntimeInformation>>;
  getProcess(processModelId: string): Promise<ProcessModelExecution.ProcessModel>;
  getFlowNodeAssociations(elementRegistry: IElementRegistry): Array<IFlowNodeAssociation>;
  getColoredXML(
    associations: Array<IFlowNodeAssociation>,
    flowNodeRuntimeInformation: Array<FlowNodeRuntimeInformation>,
    modeler: IBpmnModeler,
   ): Promise<string>;
  getActiveTokensForFlowNode(flowNodeId: string): Promise<Array<ActiveToken>>;
  addOverlays(overlays: IOverlayManager, elementRegistry: IElementRegistry, processModelId: string): void;
}

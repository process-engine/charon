import {bindable, inject} from 'aurelia-framework';

import * as bundle from '@process-engine/bpmn-js-custom-bundle';
import {DataModels} from '@process-engine/management_api_contracts';
import {IDiagram} from '@process-engine/solutionexplorer.contracts';

import {
  IBpmnModeler,
  ICanvas,
  IElementRegistry,
  IOverlayManager,
  ISolutionEntry,
  IViewbox,
} from '../../../contracts/index';

import {IFlowNodeAssociation, IHeatmapService} from './contracts';
import {solutionIsRemoteSolution} from '../../../services/solution-is-remote-solution-module/solution-is-remote-solution.module';
import {getIllegalIdErrors, getValidXml} from '../../../services/xml-id-validation-module/xml-id-validation-module';

@inject('HeatmapService')
export class Heatmap {
  public viewerContainer: HTMLDivElement;
  public noRuntimeInformation: boolean = false;
  @bindable() public activeDiagram: IDiagram;
  @bindable() public activeSolutionEntry: ISolutionEntry;

  private heatmapService: IHeatmapService;
  private modeler: IBpmnModeler;
  private viewer: IBpmnModeler;

  constructor(heatmapService: IHeatmapService) {
    this.heatmapService = heatmapService;
  }

  public activeDiagramChanged(): void {
    this.noRuntimeInformation = false;
    const attachedViewer: Element = document.getElementsByClassName('bjs-container')[0];

    const viewerContainerIsAttached: boolean =
      this.viewerContainer !== undefined &&
      this.viewerContainer !== null &&
      this.viewerContainer.childElementCount > 1 &&
      attachedViewer !== undefined &&
      attachedViewer !== null;

    if (viewerContainerIsAttached) {
      this.viewerContainer.removeChild(attachedViewer);
    }

    const viewerIsInitialized: boolean = this.viewer !== undefined;
    if (viewerIsInitialized) {
      this.viewer.detach();
      this.viewer.destroy();
    }

    this.initialize();
  }

  public async initialize(): Promise<void> {
    const noActiveDiagram: boolean = this.activeDiagram === undefined;
    if (noActiveDiagram) {
      return;
    }

    const diagramIsNoRemoteDiagram: boolean = !solutionIsRemoteSolution(this.activeDiagram.uri);
    if (diagramIsNoRemoteDiagram) {
      this.noRuntimeInformation = true;
      return;
    }

    // eslint-disable-next-line 6river/new-cap
    this.modeler = new bundle.modeler({
      moddleExtensions: {
        camunda: bundle.camundaModdleDescriptor,
      },
    });

    const result = await this.modeler.importXML(this.activeDiagram.xml);
    const {warnings} = result;

    const illegalIdErrors = getIllegalIdErrors(warnings);
    if (illegalIdErrors.length > 0) {
      const {xml: newXml} = getValidXml(this.activeDiagram.xml, illegalIdErrors);
      await this.modeler.importXML(newXml);
    }

    const elementRegistry: IElementRegistry = this.modeler.get('elementRegistry');
    /*
     * TODO: Refactoring opportunity; HeatmapService could use a fluent API; This is how it would look like:
     * this._heatmapService
     *   .setFlowNodeAssociations(elementRegistry) // -> associations
     *   .setRuntimeInformationForProcessModel(this.processmodelid) // -> flowNodeRuntimeInformation
     *   .getColoredXML(this._modeler) // <- associations, flowNodeRuntimeInformation
     */

    const associations: Array<IFlowNodeAssociation> = await this.heatmapService.getFlowNodeAssociations(
      elementRegistry,
    );

    const flowNodeRuntimeInformationList: DataModels.Kpi.FlowNodeRuntimeInformationList = await this.heatmapService.getRuntimeInformationForProcessModel(
      this.activeSolutionEntry.identity,
      this.activeDiagram.id,
    );

    const xml: string = await this.heatmapService.getColoredXML(
      associations,
      flowNodeRuntimeInformationList.flowNodeRuntimeInformation,
      this.modeler,
    );

    // eslint-disable-next-line 6river/new-cap
    this.viewer = new bundle.viewer({
      additionalModules: [bundle.ZoomScrollModule, bundle.MoveCanvasModule, bundle.MiniMap],
    });

    await this.viewer.importXML(xml);

    const overlays: IOverlayManager = this.viewer.get('overlays');

    this.heatmapService.addOverlays(
      this.activeSolutionEntry.identity,
      overlays,
      elementRegistry,
      this.activeDiagram.id,
    );

    const containerIsPresent: boolean = this.viewerContainer !== null;
    if (containerIsPresent) {
      this.viewer.attachTo(this.viewerContainer);
    }

    this.fitDiagramToViewport();
  }

  private fitDiagramToViewport(): void {
    const canvas: ICanvas = this.viewer.get('canvas');
    const viewbox: IViewbox = canvas.viewbox();
    const diagramIsVisible: boolean = viewbox.height > 0 && viewbox.width > 0;

    if (diagramIsVisible) {
      canvas.zoom('fit-viewport', 'auto');
    }
  }
}

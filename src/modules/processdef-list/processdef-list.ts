import {BpmnStudioClient, IPagination, IProcessDefEntity, IUserTaskConfig} from '@process-engine/bpmn-studio_client';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {bindable, inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {AuthenticationStateEvent, IProcessEngineService} from '../../contracts/index';
import environment from '../../environment';

@inject(EventAggregator, 'BpmnStudioClient', Router, 'ProcessEngineService')
export class ProcessDefList {
  private processEngineService: IProcessEngineService;
  private bpmnStudioClient: BpmnStudioClient;
  private eventAggregator: EventAggregator;
  private router: Router;

  private offset: number;
  private _processes: IPagination<IProcessDefEntity>;
  private getProcessesIntervalId: number;
  private subscriptions: Array<Subscription>;

  @bindable()
  private selectedFiles: FileList;
  private fileInput: HTMLInputElement;
  private reader: FileReader = new FileReader();

  @observable public currentPage: number = 1;
  public pageSize: number = 10;
  public totalItems: number;

  constructor(eventAggregator: EventAggregator, bpmnStudioClient: BpmnStudioClient, router: Router, processEngineService: IProcessEngineService) {
    this.processEngineService = processEngineService;
    this.eventAggregator = eventAggregator;
    this.bpmnStudioClient = bpmnStudioClient;
    this.router = router;

    this.refreshProcesslist();
    this.reader.onload = async(fileInformations: any): Promise<void> => {
      const xml: string = fileInformations.target.result;
      await this.processEngineService.createProcessfromXML(xml);
      this.fileInput.value = null;
      this.selectedFiles = null;
    };
  }

  public selectedFilesChanged(): void {
    if (this.selectedFiles !== null && this.selectedFiles.length > 0) {
      this.reader.readAsText(this.selectedFiles[0]);
    }
  }

  public currentPageChanged(newValue: number, oldValue: number): void {
    if (oldValue !== undefined && oldValue !== null) {
      this.refreshProcesslist();
    }
  }

  public async getProcessesFromService(): Promise<void> {
    const processCount: IPagination<IProcessDefEntity> = await this.bpmnStudioClient.getProcessDefList();
    this.totalItems = processCount.count;
    this._processes = await this.bpmnStudioClient.getProcessDefList(this.pageSize, this.pageSize * (this.currentPage - 1));
  }

  public attached(): void {
    this.getProcessesIntervalId = window.setInterval(() => {
      this.getProcessesFromService();
      // tslint:disable-next-line
    }, environment.processengine.poolingInterval);

    this.subscriptions = [
      this.eventAggregator.subscribe(AuthenticationStateEvent.LOGIN, () => {
        this.refreshProcesslist();
      }),
      this.eventAggregator.subscribe(AuthenticationStateEvent.LOGOUT, () => {
        this.refreshProcesslist();
      }),
    ];
  }

  public detached(): void {
    clearInterval(this.getProcessesIntervalId);
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
  }

  private refreshProcesslist(): void {
    this.getProcessesFromService();
  }

  public get processes(): Array<IProcessDefEntity> {
    if (this._processes === undefined) {
      return [];
    }
    return this._processes.data;
  }

  public async createProcess(): Promise<void> {
    const processesDefList: IPagination<IProcessDefEntity> = await this.bpmnStudioClient.getProcessDefList();
    const processes: Array<IProcessDefEntity> = processesDefList.data;

    const processId: string = processes.find((process: IProcessDefEntity) => {
      return process.key === 'CreateProcessDef';
    }).id;

    this.router.navigate(`processdef/${processId}/start`);
  }

  public startProcess(processId: string): void {
    this.router.navigate(`processdef/${processId}/start`);
  }

  public showDetails(processId: string): void {
    this.router.navigate(`processdef/${processId}/detail`);
  }

}

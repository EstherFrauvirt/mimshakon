import { Component, Directive, EventEmitter, Input, NgModuleRef, OnInit, Output, ViewChild } from '@angular/core';
import { ConfirmationService, FilterMatchMode, Message, MessageService, SelectItem } from 'primeng/api';
import { pipe } from 'rxjs';
import { ApiService } from 'src/app/core/data/api.service';
import { Service } from '../../models/service.model';
import { ServiceDetailsComponent } from '../service-details/service-details.component';




@Component({
    selector: 'jer-services-list',
    templateUrl: './services-list.component.html',
    styleUrls: ['./services-list.component.scss'],

})
export class ServicesListComponent implements OnInit {




    msgs: Message[] = [];
    position: string = "";
    type: number = 0;
    matchModeOptions: SelectItem[] = [];

    @Output()

    services: Service[] = [];
    params: any[] = [];
    tableSchema: any[] = [];
    selectedServices: Service[] = [];
    serviceDialog: boolean = false;
    message: string = "";
    deleteDialog: boolean = false;
    isActive: boolean = true;
    display: boolean = false;
    serviceIdToDelete: number = 0;
    title: string = "הוספת שירות";

    service: Service = {
        id: 0,
        name: '',
        module: '',
        moduleName: '',
        purpose: '',
        serviceType: '',
        typeName: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',

        isActive: false
    }
    headers: any[] = [];

    constructor(
        private messageService: MessageService,
        private apiService: ApiService,
        private confirmationService: ConfirmationService,

    ) { }

    getServices() {
        this.apiService.buildData("GET_SERVICES", {}).subscribe((data: any) => { this.services = data[0]; console.log(data); })

    }

    updateAndCopyService(service: Service, type: number) {
        this.type = type;
        if (type == 1)
            this.title = "עדכון שירות";
        else if (type == 2)
            this.title = "שכפול שירות"

        this.apiService.buildData("GET_SERVICE_BY_ID", { id: service.id }).subscribe((s: any) => {
            this.service = s[0][0];
            this.headers = s[1];
            this.params = s[2];
            this.tableSchema = s[3];
        })

        this.openNew()
    }

    deleteService() {
        this.apiService.delete("DELETE_SERVICE", { id: this.serviceIdToDelete }).subscribe((message: any) => {
            this.message = message["data"][0][0].message;
            this.display = false;
            this.showSuccess();
            this.getServices();

        });
    }

    reverseIsActive(service: Service) {
        this.apiService.put("REVERCE_IS_ACTIVE", {
            service_id: service.id, IsActive: !(service.isActive)
        }).subscribe((message: any) => {
            this.message = message["data"][0][0]["message"];
            this.showSuccess();
            this.getServices();
        });
    }
    openNew() {
        this.serviceDialog = true;

    }

    closeDialog() {
        this.serviceDialog = false;
        this.title = "הוספת שירות";
        this.service = {
            id: 0,
            name: '',
            module: '',
            moduleName: '',
            purpose: '',
            serviceType: '',
            typeName: '',
            ownerName: '',
            ownerEmail: '',
            ownerPhone: '',
            isActive: false
        }

    }

    dontDelete() {
        this.display = false;
    }

    showSuccess() {
        this.messageService.add({ severity: 'success', summary: 'הצלחנו😊', detail: this.message });
    }


    confirmDelete(service: Service) {

        this.confirmationService.confirm({
            message: 'האם אתה בטוח שברצונך למחוק את השירות?',
            header: 'מחיקת שירות',
            acceptLabel: 'כן',
            rejectLabel: 'לא',
            icon: 'pi pi-info-circle',
            accept: () => {
                this.serviceIdToDelete = service.id;
                this.deleteService();
            }
        });

    }
    ngOnInit(): void {
        this.getServices();


    }
}

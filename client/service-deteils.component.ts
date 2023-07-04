import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormGroupName, Validators } from '@angular/forms';
import { FilterService, Header, MessageService } from 'primeng/api';
import { ApiService } from 'src/app/core/data/api.service';
import { environment } from 'src/environments/environment';
import { Service } from '../../models/service.model';
import { TableSchema } from '../../models/tableSchema.model';
import { _Version } from '../../models/version.model';



@Component({
    selector: 'service-details',
    templateUrl: './service-details.component.html',
    styleUrls: ['./service-details.component.scss']
})
export class ServiceDetailsComponent implements OnInit {

    tableSchemaForm: FormArray<FormGroup> = new FormArray<FormGroup>([]);
    tableSchemaFormSmall: FormArray<FormGroup> = new FormArray<FormGroup>([]);
    addServiceFrm = new FormGroup({
        id: new FormControl<number>(0),
        serviceId: new FormControl<number>(0),
        name: new FormControl<string>('', [Validators.required, Validators.pattern("^[a-zA-Z0-9$@$! %*?&#^_.]*$")]),
        module: new FormControl<string>('', Validators.required),
        serviceType: new FormControl<string>('', Validators.required),
        purpose: new FormControl<string>('', Validators.required),
        ownerName: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
        ownerEmail: new FormControl<string>('', [Validators.required, Validators.email]),
        ownerPhone: new FormControl<string>('', [Validators.required, Validators.pattern("^[0-9]*$"), Validators.minLength(10), Validators.maxLength(10)]),
        httpMethodTarget: new FormControl<string>('', Validators.required),
        db: new FormControl<string>('', Validators.required),
        procedure: new FormControl<string>('', [Validators.required, Validators.pattern("^[a-zA-Z0-9$@$!%*?&#^_.]*$")]),
        jsonValue: new FormControl<string>('', Validators.required),
        sentUser: new FormControl<boolean>(false),
        targetUrl: new FormControl<string>('', Validators.required),
        httpMethodRequest: new FormControl<string>('', Validators.required),
        isWcf: new FormControl<boolean>(false),
        wcfData: new FormControl<string>('', Validators.required),
        getSqlData: new FormControl<boolean>(false),
        headers: new FormArray<FormGroup>([]),
        params: new FormArray<FormGroup>([]),

    });

    @Input()
    headers: any[] = [];
    @Input()
    params: any[] = [];
    @Input()
    tableSchema: TableSchema[] = [];
    showParams: boolean = false;
    showTableTitle: string = 'הסתר טבלה';
    showTableTitle2: string = 'הצג טבלה';
    selectBasicModules: string[] = [];
    selectServiceType: string[] = [];
    selectHttpMethod: string[] = [];
    selectTargetHttpMethod: string[] = [];
    selectDb: string[] = [];
    sentUserValue: boolean = false;
    isActive: boolean = false;
    showReturnObject: boolean = false;
    isSucess: boolean = false;
    hasTableSchema: boolean = false;
    isMap: boolean = false;
    pocedureResult: any;
    exampleProcedureResult: any;

    @Input()
    type: number = 0;
    @Input()
    title: string = "";
    @Input()
    service: any = {};
    @Input()
    serviceDialog: boolean = false;
    @Output()
    serviceDialogChanged: EventEmitter<boolean> = new EventEmitter<boolean>();
    @Output()
    titleChanged: EventEmitter<string> = new EventEmitter<string>();
    @Output()
    serciveChanged: EventEmitter<Service> = new EventEmitter<Service>();
    @Output()
    getServices: EventEmitter<boolean> = new EventEmitter();

    showExternal: boolean = false;
    validForm: boolean = false;
    dataFromProcedure: any = {};


    constructor(
        private apiService: ApiService,
        private messageService: MessageService,
        private filterService: FilterService,
        private fb: FormBuilder
    ) { }


    buildTableSchemaSmall() {

        for (let i = 0; i < this.tableSchemaForm.value.length; i++) {

            this.tableSchemaFormSmall.push(this.fb.group({
                isArray: this.tableSchemaForm.controls[i].get('isArray'),
                level: this.tableSchemaForm.controls[i].get('level'),
                name: this.tableSchemaForm.controls[i].get('name'),
                containerName: this.tableSchemaForm.controls[i].get('containerName'),
                updateDateId: new Date()
            }));
        }
    }

    recieveDataFromProcedure() {
        let value = this.addServiceFrm.controls['jsonValue']?.value;
        let JSONobj = null;
        let dataParams = null;
        if (value && this.isJson(value))
            JSONobj = JSON.parse(value);
        else (dataParams = this.addServiceFrm.controls['params'].value)
        const sendObject = {
            sentUser: this.addServiceFrm.controls['sentUser'].value,
            db: this.addServiceFrm.controls['db'].value,
            procedure: this.addServiceFrm.controls['procedure'].value,
            JSONobj: JSONobj,
            data: dataParams
        }
        this.apiService.recieveData(sendObject).subscribe((data) => {
            this.pocedureResult = data;
            this.tableSchemaForm.clear();
            this.showReturnObject = true;
            this.buildTableSchema();

        })
    }
    isJson(obj: any) {
        try {
            JSON.parse(obj);
        }
        catch (e) {
            alert(`json is not valid`);
            return false
        }
        return true;
    }

    buildData() {
        this.buildTableSchemaSmall();
        var data: any = {};
        data = this.addServiceFrm.getRawValue();
        if (this.isMap)
            this.createConstResult();
        data['tablesSchema'] = this.tableSchemaFormSmall.value;
        data.isActive = true;
        if (this.showExternal == true && data['headers'].length == 0)
            delete (data['headers']);
        return data;
    }
    createConstResult() {

        if (this.addServiceFrm.get('tableSchema'))

            (this.addServiceFrm as FormGroup).removeControl('tableSchema');

        (this.addServiceFrm as FormGroup).addControl('tableSchema', new FormArray([]));

        this.tableSchemaFormSmall.push(this.fb.group({

            isArray: [false, Validators.required],

            level: [0, Validators.required],

            name: ['result', Validators.required],

            containerName: [],
            updateDateId: new Date()


        }));
    }


    buildNewService() {
        const data = this.buildData();

        //check if exists a service with the same name on this module
        this.apiService.buildData("GET_SERVICE",
            {
                serviceName: this.addServiceFrm.controls['name'].value,
                module: this.addServiceFrm.controls['module'].value
            })
            .subscribe((service: any) => {
                if (service[0][0]) {
                    this.messageService.add({ severity: 'error', summary: '', detail: "כבר קיים שירות בשם זה במודול שבחרת, אנא בחר שם אחר" });
                }
                else {
                    //add this service
                    this.apiService.buildData('INSERT_SERVICE', data).subscribe(() => {
                        this.addServiceFrm.reset({ isWcf: false, sentUser: false });
                        this.getServices.emit();
                        this.messageService.add({ severity: 'success', summary: '', detail: "השרות נוסף בהצלחה" });
                        this.hideDialog();
                    });
                }

            })
    }
    updateService() {
        let data: any = {};
        data = this.buildData();
        data.serviceId = this.service.version;
        this.apiService.buildData('UPDATE_SERVICE', data).subscribe(() => {
            this.addServiceFrm.reset({ isWcf: false, sentUser: false });
            this.getServices.emit();
            this.messageService.add({ severity: 'success', summary: '', detail: "השרות  עודכן בהצלחה" });
            this.hideDialog();
        });
    }
    tableSchemaValid() {
        const controls = this.tableSchemaForm.controls;
        for (let i = 0; i < controls.length; i++) {
            if (!this.tableSchemaForm.controls[i].valid) {
                return false;
            }
            if (this.getLevel(i)?.value > 1) {
                let isExist = controls[i].value.columns.findIndex((x: any) => x === 'RECORD_NO_FROM');
                if (isExist === -1)
                    return false;
                else {
                    const parent = this.getParentIndex(i)?.value;
                    isExist = controls[parent].value.columns.findIndex((x: any) => x === 'RECORD_NO_TO');
                    if (isExist === -1)
                        return false;
                }
            }
        }
        return true;
    }
    buildTableSchema() {
        this.tableSchemaForm = new FormArray<FormGroup>([]);
        for (let i = 0; i < this.pocedureResult.data.length; i++) {

            this.tableSchemaForm.push(this.fb.group({
                name: [this.tableSchema[i]?.name, Validators.required],
                level: [this.tableSchema[i] == null ? 1 : this.tableSchema[i]?.level, Validators.required],
                containerName: [this.tableSchema[i]?.containerName],
                isArray: [this.tableSchema[i] == null ? false : this.tableSchema[i]?.isArray],
                parentIndex: [null],
                show: [false],
                data: [this.pocedureResult.data[i]],
                columns: [this.pocedureResult.columns[i]]
            }));

            this.getName(i)?.valueChanges.subscribe(value => {
                const ctrls = this.tableSchemaForm.controls;
                for (let j = 0; j < ctrls.length; j++) {
                    if (this.getParentIndex(j)?.value === i)
                        this.getContainerName(j)?.setValue(value);
                }
            });


        }

    }
    showTable(i: number) { this.getShow(i)?.setValue(!this.getShow(i)?.value); }


    left2(index: number) {

        const currentLevel = this.getLevel(index)?.value;
        if ((index !== 0 || currentLevel === 0) && currentLevel < 3) {
            for (let i = index - 1; i >= 0; i--) {
                if (this.getLevel(i)?.value === currentLevel) {
                    this.getParentIndex(index)?.setValue(i);
                    this.getContainerName(index)?.setValue(this.getName(i)?.value);


                    break;
                }
                else if (this.getLevel(i)?.value > currentLevel)
                    return;
            }
            const controls = this.tableSchemaForm;
            for (let i = index + 1; i < controls.length; i++) {
                if (this.getLevel(i)?.value === currentLevel) {
                    this.getParentIndex(i)?.setValue(this.getParentIndex(index)?.value)
                    this.getContainerName(i)?.setValue(this.getContainerName(index)?.value)
                }
            }
            this.getLevel(index)?.setValue(currentLevel + 1)
        }

    }
    left(index: number) {
        const levelValue = this.getLevel(index)?.value;
        if ((index !== 0 || levelValue === 0) && levelValue < 3) {
            for (let i = index - 1; i >= 0; i--) {
                if (this.getLevel(i)?.value === levelValue) {
                    this.getContainerName(index)?.setValue(this?.getName(i)?.value);
                    this.getParentIndex(index)?.setValue(i);
                    break;
                }
                else if (this.getLevel(i)?.value < levelValue)
                    return
            }
            const controls = this.tableSchemaForm.controls;
            for (let i = index + 1; i < controls.length; i++) {
                if (this.getParentIndex(i)?.value === index) {
                    this.getContainerName(i)?.setValue(this.getContainerName(index)?.value);
                    this.getParentIndex(i)?.setValue(this.getParentIndex(index)?.value);
                }
            }
            this.getLevel(index)?.setValue(levelValue + 1);
        }
    }
    right(index: number) {

        const levelValue = this.getLevel(index)?.value;
        const controls = this.tableSchemaForm.controls;
        for (let i = index + 1; i < controls.length; i++) {
            if (this.getParentIndex(i)?.value === index)
                return;
        }
        if (levelValue > 1 || (index === 0 && levelValue === 1)) {

            for (let i = index + 1; i < controls.length; i++) {
                if (this.getLevel(i)?.value === levelValue) {
                    this.getContainerName(i)?.setValue(this.getName(index)?.value);
                    this.getParentIndex(i)?.setValue(index);
                }
                else if (levelValue !== 1) break;
            }
            let isBreak = true;
            for (let i = index - 1; i >= 0; i--) {
                if (this.getLevel(i)?.value === levelValue - 2) {
                    this.getContainerName(index)?.setValue(this.getName(i)?.value);
                    this.getParentIndex(index)?.setValue(i);
                    isBreak = false;
                    break;
                }
            }
            if (isBreak) {
                this.getContainerName(index)?.setValue(null);
                this.getParentIndex(index)?.setValue(null);
            }
            this.getLevel(index)?.setValue(levelValue - 1);
        }
    }


    getIsArray(i: number) { return this.tableSchemaForm.controls[i].get('isArray')?.value }

    getName(i: number) { return this.tableSchemaForm.controls[i].get('name') }

    getContainerName(i: number) { return this.tableSchemaForm.controls[i].get('containerName') }

    getLevel(i: number) { return this.tableSchemaForm.controls[i].get('level') }

    getParentIndex(i: number) { return this.tableSchemaForm.controls[i].get('parentIndex') }

    getShow(i: number) { return this.tableSchemaForm.controls[i].get('show') }


    changeIsArray(i: number) {
        this.tableSchemaForm.controls[i].controls['isArray']
            .patchValue(!this.tableSchemaForm.controls[i].controls['isArray'].value)
    }
    saveService() {
        if (this.type == 0 || this.type == 2) {
            this.buildNewService();
        }
        else if (this.type == 1) {
            this.updateService();
        }
    }

    hideDialog() {

        this.serviceDialog = false;
        this.title = "הוספת שירות";
        this.serviceDialogChanged.emit();
        this.titleChanged.emit();
        this.serciveChanged.emit();
        this.addServiceFrm.reset({ isWcf: false, sentUser: false });
        this.headers = [];
        this.params = [];
        this.tableSchemaFormSmall.clear();
        this.exampleProcedureResult = {};
        this.tableSchemaForm.clear();
        this.showReturnObject = false;
        this.isMap = false;

    }
    getSelections(tableName: string) {

        this.apiService.buildData('GET_CODE_TABLES', { '@table_name': tableName }).subscribe((res) => {
            switch (tableName) {
                case "מודול בסיסי":
                    this.selectBasicModules = res[0];
                    break;
                case "סוג שירות":
                    this.selectServiceType = res[0];
            };
        });
    }
}